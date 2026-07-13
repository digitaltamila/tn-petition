import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase";
import { SignaturePad } from "../components/SignaturePad";
import { Modal } from "../components/Modal";
import type { Draft, Lang, Mla, Prepared, Recipient, Student } from "../types";
import { t } from "../i18n";
const blank: Student = {
  name: "",
  email: "",
  mobile: "",
  address: "",
  town: "",
  district: "",
  state: "Tamil Nadu",
  pin: "",
  constituency: "",
  exam: "",
  examYear: "2026",
  registration: "",
  dob: "",
};
const consentText = [
  "I confirm that the information I entered is accurate.",
  "I authorise this application to generate the petition using my details and signature.",
  "I authorise this application to send this specific email from my Gmail account after I review and approve it.",
  "I understand that this application is not affiliated with the Tamil Nadu Government.",
];
const steps = [
  "details",
  "signature",
  "consent",
  "preview",
  "recipients",
  "email",
] as const;
export function Petition({ lang }: { lang: Lang }) {
  const [step, setStep] = useState(0),
    [student, setStudent] = useState(blank),
    [signature, setSignature] = useState(""),
    [consents, setConsents] = useState([false, false, false, false]),
    [recipients, setRecipients] = useState<Recipient[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [prepared, setPrepared] = useState<Prepared>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(false),
    [success, setSuccess] = useState<{
      reference: string;
      sentAt: string;
      sender: string;
      departments: string[];
      attachments: Prepared["attachments"];
    }>();
  useEffect(() => {
    if (step === 4)
      void (async () => {
        try {
          const r = await httpsCallable<
            { constituency: string },
            { recipients: Recipient[] }
          >(
            functions,
            "listRecipients",
          )({ constituency: student.constituency });
          setRecipients(r.data.recipients);
          setSelected(r.data.recipients.map((x) => x.id));
        } catch {
          setError("Verified recipient list is currently unavailable.");
        }
      })();
  }, [step, student.constituency]);
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (student.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(student.email)) e.email = "Enter a valid email";
    if (!/^[6-9]\d{9}$/.test(student.mobile))
      e.mobile = "Enter a valid 10-digit Indian mobile";
    if (student.address.trim().length < 8)
      e.address = "Enter the full postal address";
    if (!student.town) e.town = "Required";
    if (!student.district) e.district = "Required";
    if (student.state !== "Tamil Nadu") e.state = "Tamil Nadu address required";
    if (!/^\d{6}$/.test(student.pin)) e.pin = "Enter 6-digit PIN";
    if (!student.exam) e.exam = "Required";
    if (!/^20\d{2}$/.test(student.examYear)) e.examYear = "Invalid year";
    return e;
  }, [student]);
  const next = async () => {
    setError("");
    if (step === 0 && Object.keys(errors).length) {
      setError("Please correct the highlighted fields.");
      return;
    }
    if (step === 1 && !signature) {
      setError("Please add your signature.");
      return;
    }
    if (step === 2 && !consents.every(Boolean)) {
      setError("All consent statements are required.");
      return;
    }
    if (step === 4) {
      if (!selected.length) {
        setError("Select at least one verified recipient.");
        return;
      }
      await prepare();
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };
  const prepare = async () => {
    setBusy(true);
    try {
      const draft: Draft = {
        student,
        signature,
        consents,
        consentVersion: "1.0",
        recipientIds: selected,
        idempotencyKey: crypto.randomUUID(),
      };
      const r = await httpsCallable<Draft, Prepared>(
        functions,
        "preparePetition",
      )(draft);
      setPrepared(r.data);
      setStep(5);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
      provider.setCustomParameters({
        prompt: "consent",
        login_hint: student.email,
      });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken)
        throw new Error("Gmail permission was not granted.");
      const r = await httpsCallable<
        {
          gmailAccessToken: string;
          reference: string;
          idempotencyKey: string;
          sealed: string;
        },
        {
          reference: string;
          sentAt: string;
          sender: string;
          departments: string[];
        }
      >(
        functions,
        "sendPetition",
      )({
        gmailAccessToken: credential.accessToken,
        reference: prepared!.reference,
        idempotencyKey: prepared!.reference,
        sealed: prepared!.sealed,
      });
      setSuccess({
        ...r.data,
        attachments: prepared!.attachments,
      });
      setModal(false);
    } catch (e) {
      setError(message(e));
      setModal(false);
    } finally {
      setBusy(false);
    }
  };
  if (success) return <Success data={success} />;
  return (
    <div className="mx-auto max-w-4xl px-3 py-6 pb-28 sm:px-4 md:py-10">
      <ol
        className="mb-6 flex snap-x gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible"
        aria-label="Progress"
      >
        {steps.map((s, i) => (
          <li
            key={s}
            className={`min-w-28 snap-start rounded-lg p-2 text-center text-xs font-semibold md:min-w-0 ${i <= step ? "bg-navy text-white" : "bg-slate-200"}`}
            aria-current={i === step ? "step" : undefined}
          >
            {i + 1}. {t(lang, s)}
          </li>
        ))}
      </ol>
      <section className="card rounded-xl p-4 sm:p-6 md:rounded-2xl md:p-7">
        <h1 className="mb-6 text-2xl font-bold text-navy">
          {t(lang, steps[step])}
        </h1>
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
          >
            {error}
          </div>
        )}
        {step === 0 && (
          <Details value={student} set={setStudent} errors={errors} />
        )}{" "}
        {step === 1 && (
          <SignaturePad value={signature} onChange={setSignature} />
        )}{" "}
        {step === 2 && (
          <div className="space-y-4">
            {consentText.map((x, i) => (
              <label
                key={x}
                className="flex cursor-pointer gap-3 rounded-lg border p-4"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={consents[i]}
                  onChange={(e) =>
                    setConsents((c) =>
                      c.map((v, n) => (n === i ? e.target.checked : v)),
                    )
                  }
                />
                <span>{x}</span>
              </label>
            ))}
            <p className="text-sm text-slate-500">
              Consent version 1.0 · Timestamp recorded on the server.
            </p>
          </div>
        )}{" "}
        {step === 3 && <Preview student={student} signature={signature} />}{" "}
        {step === 4 && (
          <RecipientSelect
            recipients={recipients}
            selected={selected}
            set={setSelected}
          />
        )}{" "}
        {step === 5 && prepared && <EmailReview prepared={prepared} />}
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-between gap-3 border-t bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,.12)] backdrop-blur md:static md:mt-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          {step > 0 && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
            >
              {t(lang, "back")}
            </button>
          )}
          <button
            className="btn-primary ml-auto"
            disabled={busy}
            onClick={step === 5 ? () => setModal(true) : next}
          >
            {busy
              ? "Please wait…"
              : step === 5
                ? "Review and Send Petition"
                : t(lang, "continue")}
          </button>
        </div>
      </section>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        onConfirm={send}
        busy={busy}
      />
    </div>
  );
}
function Details({
  value,
  set,
  errors,
}: {
  value: Student;
  set: (s: Student) => void;
  errors: Record<string, string>;
}) {
  const [mlas, setMlas] = useState<Mla[]>([]),
    [localities, setLocalities] = useState<string[]>([]),
    [postalStatus, setPostalStatus] = useState("");
  useEffect(() => {
    void httpsCallable<undefined, { mlas: Mla[] }>(functions, "listMlas")()
      .then((r) => setMlas(r.data.mlas))
      .catch(() => setMlas([]));
  }, []);
  useEffect(() => {
    if (!/^6\d{5}$/.test(value.pin)) return;
    const timer = window.setTimeout(() => {
      setPostalStatus("Looking up postal address…");
      void httpsCallable<
        { pin: string },
        { localities: string[]; district: string; state: string }
      >(
        functions,
        "lookupPin",
      )({ pin: value.pin })
        .then((r) => {
          setLocalities(r.data.localities);
          set({
            ...value,
            town: r.data.localities.includes(value.town)
              ? value.town
              : r.data.localities[0],
            district: r.data.district,
            state: r.data.state,
          });
          setPostalStatus("Address found. Please confirm your locality.");
        })
        .catch(() =>
          setPostalStatus(
            "Postal lookup unavailable. Enter the address manually.",
          ),
        );
    }, 350);
    return () => window.clearTimeout(timer);
    // The lookup must rerun only when PIN changes; including the populated address would create a request loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.pin]);
  const selectedMla = mlas.find((x) => x.constituency === value.constituency);
  const fields: [keyof Student, string, string?][] = [
    ["name", "Full name / முழுப் பெயர்"],
    ["email", "Email / மின்னஞ்சல்", "email"],
    ["mobile", "Mobile number / கைப்பேசி", "tel"],
    ["address", "House/Street address / வீட்டு முகவரி"],
    ["exam", "Examination applied for / தேர்வு"],
    ["examYear", "Examination year / ஆண்டு"],
    ["registration", "Candidate registration number (optional)"],
    ["dob", "Date of birth (optional)", "date"],
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map(([k, l, type]) => (
        <label key={k} className={k === "address" ? "md:col-span-2" : ""}>
          <span className="label">{l}</span>
          <input
            className={`field ${errors[k] ? "border-red-500" : ""}`}
            type={type || "text"}
            value={value[k]}
            onChange={(e) => set({ ...value, [k]: e.target.value })}
            maxLength={k === "address" ? 300 : 100}
            aria-invalid={!!errors[k]}
            aria-describedby={errors[k] ? `${k}-error` : undefined}
          />
          {errors[k] && (
            <span id={`${k}-error`} className="mt-1 block text-sm text-red-700">
              {errors[k]}
            </span>
          )}
        </label>
      ))}
      <label>
        <span className="label">PIN code / அஞ்சல் குறியீடு</span>
        <input
          inputMode="numeric"
          className={`field ${errors.pin ? "border-red-500" : ""}`}
          maxLength={6}
          value={value.pin}
          onChange={(e) =>
            set({ ...value, pin: e.target.value.replace(/\D/g, "") })
          }
        />
        <span className="mt-1 block text-sm text-slate-500" aria-live="polite">
          {postalStatus}
        </span>
      </label>
      <label>
        <span className="label">Village or town / ஊர்</span>
        {localities.length ? (
          <select
            className="field"
            value={value.town}
            onChange={(e) => set({ ...value, town: e.target.value })}
          >
            {localities.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ) : (
          <input
            className="field"
            value={value.town}
            onChange={(e) => set({ ...value, town: e.target.value })}
          />
        )}
      </label>
      <label>
        <span className="label">District / மாவட்டம்</span>
        <input
          className="field bg-slate-100"
          value={value.district}
          readOnly={localities.length > 0}
          onChange={(e) => set({ ...value, district: e.target.value })}
        />
      </label>
      <label>
        <span className="label">State / மாநிலம்</span>
        <input className="field bg-slate-100" value={value.state} readOnly />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Assembly constituency / சட்டமன்றத் தொகுதி</span>
        <select
          className="field"
          value={value.constituency}
          onChange={(e) => set({ ...value, constituency: e.target.value })}
        >
          <option value="">Select after confirming your locality</option>
          {mlas.map((x) => (
            <option key={x.id} value={x.constituency}>
              {x.constituency}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-sm text-slate-500">
          PIN codes are postal areas and do not uniquely identify constituency
          boundaries. Please confirm this selection.
        </span>
      </label>
      {selectedMla && (
        <aside
          className="sm:col-span-2 rounded-xl border border-green/30 bg-green/5 p-4"
          aria-live="polite"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-green">
            Your MLA / உங்கள் சட்டமன்ற உறுப்பினர்
          </p>
          <p className="mt-2 text-lg font-bold text-navy">{selectedMla.name}</p>
          <p>{selectedMla.constituency}</p>
          <p className="mt-1 break-all text-sm">{selectedMla.email}</p>
          <a
            className="mt-2 inline-block text-sm font-semibold text-green underline"
            href={selectedMla.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Verified Tamil Nadu Assembly source
          </a>
        </aside>
      )}
    </div>
  );
}
function Preview({
  student,
  signature,
}: {
  student: Student;
  signature: string;
}) {
  return (
    <div className="rounded border bg-white p-5 leading-8">
      <p>
        இடம்: {student.town}
        <br />
        தேதி: {new Date().toLocaleDateString("en-IN")}
      </p>
      <p className="mt-4">
        <b>அனுப்புநர்:</b>
        <br />
        {student.name}
        <br />
        {student.address}, {student.town}, {student.district} - {student.pin}
        <br />
        {student.mobile} · {student.email}
      </p>
      <p className="mt-4">
        <b>பொருள்:</b> காவல்துறை ஆட்சேர்ப்பு முடிவுகள், 2026 PC/SI அறிவிப்புகள்
        மற்றும் வயது தளர்வு கோருதல்.
      </p>
      <p className="mt-4">
        மதிப்பிற்குரிய ஐயா/அம்மையீர், காவல்துறையில் பணியாற்ற ஆவலுடன்
        தயாராகிவரும் விண்ணப்பதாரர்கள் சார்பாக, நிலுவையில் உள்ள தேர்வு முடிவுகளை
        விரைந்து வெளியிடவும், 2026 ஆம் ஆண்டுக்கான இரண்டாம் நிலைக் காவலர் மற்றும்
        சார்பு ஆய்வாளர் ஆட்சேர்ப்பு அறிவிப்புகளை விரைவில் வெளியிடவும், அறிவிப்பு
        மற்றும் தேர்வு தாமதங்களால் வயது வரம்பை இழந்த விண்ணப்பதாரர்களுக்கு உரிய
        வயது தளர்வு வழங்கவும் பணிவுடன் கேட்டுக்கொள்கிறேன்.
      </p>
      <img
        src={signature}
        alt="Applicant signature"
        className="mt-6 h-20 max-w-52 object-contain"
      />
      <p>{student.name}</p>
    </div>
  );
}
function RecipientSelect({
  recipients,
  selected,
  set,
}: {
  recipients: Recipient[];
  selected: string[];
  set: (x: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      {recipients.length === 0 ? (
        <p>
          No active, officially verified recipients are configured. An
          administrator must verify official sources before launch.
        </p>
      ) : (
        recipients.map((r) => (
          <label className="flex gap-3 rounded-lg border p-4" key={r.id}>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={selected.includes(r.id)}
              onChange={(e) =>
                set(
                  e.target.checked
                    ? [...selected, r.id]
                    : selected.filter((x) => x !== r.id),
                )
              }
            />
            <span>
              <b>{r.departmentName}</b>
              <br />
              <span className="text-sm text-slate-500">
                {r.recipientType} · {r.delivery.toUpperCase()} · verified{" "}
                {r.lastVerifiedDate}
              </span>
            </span>
          </label>
        ))
      )}
    </div>
  );
}
function EmailReview({ prepared }: { prepared: Prepared }) {
  return (
    <div>
      <dl className="grid gap-2">
        <dt className="font-bold">To / CC</dt>
        <dd>
          {prepared.recipients
            .map((r) => `${r.departmentName} (${r.delivery.toUpperCase()})`)
            .join(", ")}
        </dd>
        <dt className="mt-3 font-bold">Subject</dt>
        <dd>{prepared.emailSubject}</dd>
      </dl>
      <pre className="mt-5 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-sans text-sm">
        {prepared.emailBody}
      </pre>
      <div className="mt-5 flex flex-wrap gap-3">
        {prepared.attachments.map((attachment) => (
          <button
            key={attachment.fileName}
            className="btn-secondary"
            onClick={() =>
              downloadPdf(attachment.pdfBase64, attachment.fileName)
            }
          >
            {attachment.kind === "mla" ? "MLA petition" : "Government petition"}
            : {attachment.departmentName}
          </button>
        ))}
      </div>
    </div>
  );
}
function Success({
  data,
}: {
  data: {
    reference: string;
    sentAt: string;
    sender: string;
    departments: string[];
    attachments: Prepared["attachments"];
  };
}) {
  return (
    <div className="card mx-auto my-12 max-w-2xl text-center">
      <div className="text-5xl">✓</div>
      <h1 className="mt-4 text-3xl font-bold text-green">
        Petition sent successfully
      </h1>
      <p className="mt-5 text-xl font-bold">{data.reference}</p>
      <p>
        {new Date(data.sentAt).toLocaleString()} · {data.sender}
      </p>
      <p className="mt-3">{data.departments.join(", ")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {data.attachments.map((attachment) => (
          <button
            key={attachment.fileName}
            className="btn-secondary"
            onClick={() =>
              downloadPdf(attachment.pdfBase64, attachment.fileName)
            }
          >
            Download {attachment.kind === "mla" ? "MLA" : "Government"} PDF
          </button>
        ))}
        <button className="btn-primary" onClick={() => window.print()}>
          Print acknowledgement
        </button>
      </div>
    </div>
  );
}
function downloadPdf(base64: string, name: string) {
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${base64}`;
  a.download = name;
  a.click();
}
function message(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong. Please retry.";
}
