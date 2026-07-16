import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { google } from "googleapis";
import crypto from "node:crypto";
import { draftSchema, sendSchema } from "./schema.js";
import { makePdf } from "./pdf.js";
import { seal, unseal } from "./crypto.js";
initializeApp();
const db = getFirestore(),
  payloadKey = defineSecret("PETITION_PAYLOAD_KEY"),
  pinLookupUrl = defineString("PIN_LOOKUP_API_URL", {
    default: "https://api.postalpincode.in/pincode/{pin}",
  });
const region = "asia-south1",
  campaignId = "tn-police-recruitment-2026",
  subject =
    "Request regarding Tamil Nadu Police Recruitment Results, 2026 Notification and Age Relaxation";
type Recipient = {
  id: string;
  departmentName: string;
  email: string;
  recipientType: string;
  delivery: "to" | "cc";
  active: boolean;
  verificationStatus: string;
  lastVerifiedDate?: string;
  sourceUrl?: string;
};
type Sealed = {
  draft: ReturnType<typeof draftSchema.parse>;
  reference: string;
  generated: string;
  recipients: Recipient[];
  expires: number;
};
export const listRecipients = onCall(
  { region, enforceAppCheck: true },
  async (req) => {
    const constituency =
      typeof req.data?.constituency === "string" ? req.data.constituency : "";
    const s = await db
      .collection("governmentRecipients")
      .where("active", "==", true)
      .where("verificationStatus", "==", "verified")
      .get();
    const recipients = s.docs
      .map(
        (d) =>
          ({ id: d.id, ...d.data() }) as Recipient & { constituency?: string },
      )
      .filter(
        (r) =>
          r.recipientType !== "mla" ||
          Boolean(constituency && r.constituency === constituency),
      );
    return { recipients };
  },
);
export const listMlas = onCall({ region, enforceAppCheck: true }, async () => {
  const s = await db
    .collection("governmentRecipients")
    .where("recipientType", "==", "mla")
    .where("active", "==", true)
    .where("verificationStatus", "==", "verified")
    .get();
  return {
    mlas: s.docs
      .map((d) => {
        const x = d.data();
        return {
          id: d.id,
          name: x.mlaName,
          constituency: x.constituency,
          district: x.district,
          email: x.email,
          photoUrl: x.photoUrl,
          sourceUrl: x.sourceUrl,
          verifiedAt: x.lastVerifiedDate,
        };
      })
      .sort((a, b) => a.constituency.localeCompare(b.constituency)),
  };
});
export const lookupPin = onCall(
  { region, enforceAppCheck: true, timeoutSeconds: 10 },
  async (req) => {
    const pin = String(req.data?.pin || "");
    if (!/^6\d{5}$/.test(pin))
      throw new HttpsError(
        "invalid-argument",
        "Enter a valid Tamil Nadu PIN code.",
      );
    const response = await fetch(
      pinLookupUrl.value().replace("{pin}", encodeURIComponent(pin)),
      { headers: { accept: "application/json" } },
    );
    if (!response.ok)
      throw new HttpsError(
        "unavailable",
        "Postal lookup is temporarily unavailable.",
      );
    const json = (await response.json()) as Array<{
      PostOffice?: Array<{ Name: string; District: string; State: string }>;
    }>;
    const offices = (json[0]?.PostOffice || []).filter(
      (x) => x.State.toLowerCase() === "tamil nadu",
    );
    if (!offices.length)
      throw new HttpsError(
        "not-found",
        "No Tamil Nadu postal localities were found for this PIN code.",
      );
    return {
      localities: [...new Set(offices.map((x) => x.Name))],
      district: offices[0].District,
      state: "Tamil Nadu",
      source: "postal-directory",
    };
  },
);
export const preparePetition = onCall(
  { region, enforceAppCheck: false, secrets: [payloadKey], memory: "512MiB" },
  async (req) => {
    if (!req.auth)
      throw new HttpsError(
        "unauthenticated",
        "Authorize your Gmail account before preparing the petition.",
      );
    await rateLimit(req.rawRequest.ip || "unknown", "prepare", 10);
    const draft = parse(draftSchema, req.data);
    if (
      !req.auth.token.email ||
      req.auth.token.email.toLowerCase() !== draft.student.email.toLowerCase()
    )
      throw new HttpsError(
        "permission-denied",
        "The authorized Gmail account must match the petition email.",
      );
    const campaign = await db.doc(`campaigns/${campaignId}`).get();
    if (campaign.exists && campaign.data()?.enabled === false)
      throw new HttpsError(
        "failed-precondition",
        "This petition campaign is currently closed.",
      );
    const docs = await Promise.all(
      draft.recipientIds.map((id) =>
        db.doc(`governmentRecipients/${id}`).get(),
      ),
    );
    const recipients = docs
      .filter((d) => d.exists)
      .map((d) => ({ id: d.id, ...d.data() }) as Recipient)
      .filter((r) => r.active && r.verificationStatus === "verified");
    if (recipients.length !== draft.recipientIds.length)
      throw new HttpsError(
        "failed-precondition",
        "A selected recipient is not currently verified.",
      );
    if (
      recipients.some((r) => r.recipientType === "mla") &&
      !draft.student.constituency
    )
      throw new HttpsError(
        "invalid-argument",
        "Assembly constituency is required when an MLA recipient is selected.",
      );
    const reference = await nextReference(),
      generated = new Date().toISOString(),
      attachments = await generateAttachments(
        draft.student,
        draft.signature,
        reference,
        generated,
        recipients,
      ),
      emailBody = body(draft.student, reference, generated);
    return {
      reference,
      attachments: attachments.map((a) => ({
        kind: a.kind,
        departmentName: a.departmentName,
        fileName: a.fileName,
        pdfBase64: a.pdf.toString("base64"),
      })),
      emailSubject: subject,
      emailBody,
      recipients,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      sealed: seal(
        {
          draft,
          reference,
          generated,
          recipients,
          expires: Date.now() + 15 * 60_000,
        },
        payloadKey.value(),
      ),
    };
  },
);
export const sendPetition = onCall(
  {
    region,
    enforceAppCheck: false,
    secrets: [payloadKey],
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (req) => {
    if (!req.auth)
      throw new HttpsError("unauthenticated", "Google sign-in is required.");
    await rateLimit(req.rawRequest.ip || "unknown", "send", 3);
    const input = parse(sendSchema, req.data);
    let payload: Sealed;
    try {
      payload = unseal<Sealed>(input.sealed, payloadKey.value());
    } catch {
      throw new HttpsError(
        "invalid-argument",
        "The petition session is invalid.",
      );
    }
    if (payload.expires < Date.now() || payload.reference !== input.reference)
      throw new HttpsError(
        "deadline-exceeded",
        "The review session expired. Please prepare the petition again.",
      );
    const uid = req.auth.uid,
      user = await getAuth().getUser(uid);
    if (user.disabled)
      throw new HttpsError("permission-denied", "This account is blocked.");
    const oauth = new google.auth.OAuth2();
    oauth.setCredentials({ access_token: input.gmailAccessToken });
    const info = (
        await google.oauth2({ version: "v2", auth: oauth }).userinfo.get()
      ).data,
      sender = (info.email || "").toLowerCase();
    if (
      !info.verified_email ||
      sender !== payload.draft.student.email.toLowerCase() ||
      sender !== user.email?.toLowerCase()
    )
      throw new HttpsError(
        "permission-denied",
        "The signed-in Gmail address must match the petition email.",
      );
    const petitionRef = db.doc(`petitions/${payload.reference}`),
      duplicate = await db
        .collection("petitions")
        .where("userUid", "==", uid)
        .where("campaignId", "==", campaignId)
        .limit(1)
        .get();
    if (!duplicate.empty)
      throw new HttpsError(
        "already-exists",
        "This verified Gmail account has already submitted this campaign.",
      );
    if (payload.draft.student.registration) {
      const reg = await db
        .collection("petitions")
        .where(
          "registrationHash",
          "==",
          hash(payload.draft.student.registration.toUpperCase()),
        )
        .where("campaignId", "==", campaignId)
        .limit(1)
        .get();
      if (!reg.empty)
        throw new HttpsError(
          "already-exists",
          "This candidate registration number has already been used.",
        );
    }
    const existing = await petitionRef.get();
    if (existing.exists && existing.data()?.sendStatus === "success")
      throw new HttpsError(
        "already-exists",
        "This petition has already been sent.",
      );
    const attachments = await generateAttachments(
      payload.draft.student,
      payload.draft.signature,
      payload.reference,
      payload.generated,
      payload.recipients,
    );
    const raw = mime(
      sender,
      payload.recipients,
      subject,
      body(payload.draft.student, payload.reference, payload.generated),
      attachments,
    );
    await petitionRef.set(
      {
        petitionReference: payload.reference,
        userUid: uid,
        studentName: payload.draft.student.name,
        emailMasked: mask(sender),
        district: payload.draft.student.district,
        campaignId,
        submissionTimestamp: FieldValue.serverTimestamp(),
        sendStatus: "processing",
        gmailSendStatus: "processing",
        recipientDepartmentNames: payload.recipients.map(
          (r) => r.departmentName,
        ),
        consentVersion: payload.draft.consentVersion,
        consentTimestamp: FieldValue.serverTimestamp(),
        registrationHash: payload.draft.student.registration
          ? hash(payload.draft.student.registration.toUpperCase())
          : null,
      },
      { merge: true },
    );
    try {
      await google
        .gmail({ version: "v1", auth: oauth })
        .users.messages.send({ userId: "me", requestBody: { raw } });
      const sentAt = new Date().toISOString();
      await petitionRef.update({
        sendStatus: "success",
        gmailSendStatus: "success",
        sentAt,
      });
      return {
        reference: payload.reference,
        sentAt,
        sender,
        departments: payload.recipients.map((r) => r.departmentName),
      };
    } catch {
      await petitionRef.update({
        sendStatus: "failed",
        gmailSendStatus: "failed",
        errorCode: "GMAIL_SEND_FAILED",
      });
      await db.collection("failureLogs").add({
        code: "GMAIL_SEND_FAILED",
        reference: payload.reference,
        timestamp: FieldValue.serverTimestamp(),
      });
      throw new HttpsError(
        "unavailable",
        "Gmail could not send the petition. It was not marked successful.",
      );
    }
  },
);
function parse<T>(
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
  v: unknown,
): T {
  const r = schema.safeParse(v);
  if (!r.success)
    throw new HttpsError("invalid-argument", "Submitted data is invalid.");
  return r.data as T;
}
async function nextReference() {
  return db.runTransaction(async (tx) => {
    const ref = db.doc("counters/petitions2026"),
      snap = await tx.get(ref),
      n = (snap.data()?.value || 0) + 1;
    tx.set(ref, { value: n }, { merge: true });
    return `TNPR-2026-${String(n).padStart(6, "0")}`;
  });
}
function safe(x: string) {
  return x
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .slice(0, 60);
}
function hash(x: string) {
  return crypto.createHash("sha256").update(x).digest("hex");
}
function mask(x: string) {
  const [a, b] = x.split("@");
  return `${a.slice(0, 2)}***@${b}`;
}
async function rateLimit(ip: string, kind: string, max: number) {
  const bucket = Math.floor(Date.now() / 3600000),
    id = hash(`${process.env.GCLOUD_PROJECT}:${ip}:${kind}:${bucket}`),
    ref = db.doc(`rateLimits/${id}`);
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref),
      count = (s.data()?.count || 0) + 1;
    if (count > max)
      throw new HttpsError(
        "resource-exhausted",
        "Too many attempts. Please try later.",
      );
    tx.set(
      ref,
      { count, expiresAt: new Date(Date.now() + 2 * 3600000) },
      { merge: true },
    );
  });
}
function body(s: Sealed["draft"]["student"], ref: string, date: string) {
  return `Respected Sir/Madam,\n\nI am submitting this public petition regarding the following requests concerning Tamil Nadu police recruitment:\n\n1. Early publication of the pending police recruitment examination results.\n2. Early release of the 2026 PC and SI recruitment notifications.\n3. Appropriate age relaxation for candidates affected by delays in recruitment notifications and examination processes.\n\nI request the concerned authorities to consider the difficulties faced by police recruitment aspirants and take the necessary action at the earliest.\n\nMy complete signed petition is attached to this email as a PDF.\n\nApplicant details:\nName: ${s.name}\nEmail: ${s.email}\nMobile Number: ${s.mobile}\nAddress: ${s.address}, ${s.town} - ${s.pin}\nDistrict: ${s.district}\nDate: ${new Date(date).toLocaleDateString("en-IN")}\nPetition Reference: ${ref}\n\nThank you.\n\nYours faithfully,\n${s.name}`;
}
type Attachment = {
  kind: "government" | "mla";
  departmentName: string;
  fileName: string;
  pdf: Buffer;
};
async function generateAttachments(
  s: Sealed["draft"]["student"],
  signature: string,
  reference: string,
  generated: string,
  recipients: Recipient[],
) {
  const groups: Attachment[] = [];
  const government = recipients.filter((r) => r.recipientType !== "mla");
  if (government.length) {
    const departmentName = government.map((r) => r.departmentName).join(", "),
      fileName = `TN_Police_Petition_Government_${safe(s.name)}_${generated.slice(0, 10)}.pdf`;
    groups.push({
      kind: "government",
      departmentName,
      fileName,
      pdf: await makePdf(
        s,
        signature,
        reference,
        generated,
        "government",
        departmentName,
      ),
    });
  }
  for (const r of recipients.filter((r) => r.recipientType === "mla")) {
    const fileName = `TN_Police_Petition_MLA_${safe(s.name)}_${generated.slice(0, 10)}.pdf`;
    groups.push({
      kind: "mla",
      departmentName: r.departmentName,
      fileName,
      pdf: await makePdf(
        s,
        signature,
        reference,
        generated,
        "mla",
        r.departmentName,
      ),
    });
  }
  return groups;
}
function mime(
  sender: string,
  rs: Recipient[],
  sub: string,
  text: string,
  attachments: Attachment[],
) {
  const boundary = `tnpr_${crypto.randomBytes(16).toString("hex")}`,
    to = rs.filter((r) => r.delivery === "to").map((r) => r.email),
    cc = rs.filter((r) => r.delivery === "cc").map((r) => r.email);
  if (!to.length) to.push(sender);
  const lines = [
    `From: ${sender}`,
    `To: ${to.join(", ")}`,
    cc.length ? `Cc: ${cc.join(", ")}` : "",
    `Subject: ${sub}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(text).toString("base64"),
  ];
  for (const a of attachments)
    lines.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${a.fileName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${a.fileName}"`,
      "",
      a.pdf.toString("base64"),
    );
  lines.push(`--${boundary}--`);
  return Buffer.from(lines.filter(Boolean).join("\r\n")).toString("base64url");
}
