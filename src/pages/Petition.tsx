import { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseConfigured, functions } from "../firebase";
import { SignaturePad } from "../components/SignaturePad";
import type { Draft, Lang, Mla, Prepared, Recipient, Student } from "../types";
import { localized, t } from "../i18n";
import { emailDraftUrl } from "../emailDraft";
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
const consentText = {
  en: [
    "I confirm that the information I entered is accurate.",
    "I authorise this application to generate this petition using my details and signature.",
    "I understand that this website will prepare the PDF and email draft. I will attach the PDF and send the email myself.",
    "I understand that this application is not affiliated with the Tamil Nadu Government.",
  ],
  ta: [
    "நான் உள்ளிட்ட தகவல்கள் சரியானவை என்பதை உறுதிப்படுத்துகிறேன்.",
    "எனது விவரங்கள் மற்றும் கையொப்பத்தைப் பயன்படுத்தி இந்த மனுவை உருவாக்க அனுமதிக்கிறேன்.",
    "இந்த இணையதளம் PDF மற்றும் மின்னஞ்சல் வரைவைத் தயாரிக்கும் என்பதை நான் புரிந்துகொள்கிறேன். PDF-ஐ இணைத்து மின்னஞ்சலை நானே அனுப்புவேன்.",
    "இந்தச் செயலி தமிழ்நாடு அரசுடன் இணைக்கப்படவில்லை என்பதைப் புரிந்துகொள்கிறேன்.",
  ],
};
const steps = [
  "details",
  "signature",
  "consent",
  "preview",
  "recipients",
  "email",
] as const;
const stepHelp = {
  en: [
    "Tell us who you are and which examination you applied for.",
    "Add the signature that will appear on your petition.",
    "Read and approve each statement before continuing.",
    "Check your personalised petition carefully.",
    "Confirm the verified authorities who will receive your petition.",
    "Review the email and attachments, then open your own email draft.",
  ],
  ta: [
    "உங்கள் விவரங்களையும் விண்ணப்பித்த தேர்வையும் உள்ளிடவும்.",
    "மனுவில் இடம்பெறும் உங்கள் கையொப்பத்தைச் சேர்க்கவும்.",
    "தொடர்வதற்கு முன் ஒவ்வொரு அறிக்கையையும் படித்து ஒப்புதல் அளிக்கவும்.",
    "தனிப்பட்ட மனுவை முழுமையாகச் சரிபார்க்கவும்.",
    "மனுவைப் பெறும் சரிபார்க்கப்பட்ட அதிகாரிகளை உறுதிப்படுத்தவும்.",
    "உள்நுழைவதற்கு முன் மின்னஞ்சல் மற்றும் இணைப்புகளை ஆய்வு செய்யவும்.",
  ],
} as const;
type PostalResult = { localities: string[]; district: string; state: string };
type MlaDirectory = {
  sourceUrl: string;
  verifiedAt: string;
  members: Array<{
    name: string;
    constituency: string;
    district: string;
    email: string;
    photoUrl: string;
  }>;
};
const mandatoryCcRecipients = [
  {
    department: "Tamil Nadu Uniformed Services Recruitment Board",
    email: "tnusrb@nic.in",
  },
  { department: "Chief Minister's Helpline", email: "cmhelpline@tn.gov.in" },
] as const;
function mlaRecipientId(email: string) {
  return `mla_${email.split("@")[0].replace(/^mla/, "")}`;
}
async function loadLocalMlas(): Promise<Mla[]> {
  const response = await fetch("/data/mla-directory.json");
  if (!response.ok) throw new Error("MLA directory unavailable");
  const directory = (await response.json()) as MlaDirectory;
  const mlas = directory.members
    .map((member) => ({
      ...member,
      id: mlaRecipientId(member.email),
      sourceUrl: directory.sourceUrl,
      verifiedAt: directory.verifiedAt,
    }))
    .sort((a, b) => a.constituency.localeCompare(b.constituency));
  if (!mlas.length) throw new Error("MLA directory is empty");
  return mlas;
}
function mlaAsRecipient(mla: Mla): Recipient {
  return {
    id: mla.id,
    departmentName: `Member of Legislative Assembly — ${mla.constituency} (${mla.name})`,
    email: mla.email,
    recipientType: "mla",
    delivery: "to",
    active: true,
    verificationStatus: "verified",
    lastVerifiedDate: mla.verifiedAt,
    sourceUrl: mla.sourceUrl,
  };
}
function districtKey(district: string) {
  const value = district.toLowerCase().replace(/[^a-z]/g, "");
  const aliases: Record<string, string> = {
    kanchipuram: "kancheepuram",
    kanyakumari: "kanniyakumari",
    thiruvallur: "tiruvallur",
    tirupattur: "tirupathur",
    tuticorin: "thoothukudi",
    villupuram: "viluppuram",
    thenilgiris: "nilgiris",
    trichy: "tiruchirappalli",
  };
  return aliases[value] || value;
}
async function lookupPostalAddress(pin: string): Promise<PostalResult> {
  if (firebaseConfigured) {
    try {
      const response = await httpsCallable<{ pin: string }, PostalResult>(
        functions,
        "lookupPin",
      )({ pin });
      return response.data;
    } catch {
      /* Cloudflare fallback below */
    }
  }
  const response = await fetch(`/api/pincode/${encodeURIComponent(pin)}`, {
    headers: { accept: "application/json" },
  });
  const payload = (await response.json()) as PostalResult & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Postal lookup failed");
  return payload;
}
export function Petition({ lang }: { lang: Lang }) {
  const [step, setStep] = useState(0),
    [student, setStudent] = useState(blank),
    [signature, setSignature] = useState(""),
    [consents, setConsents] = useState([false, false, false, false]),
    [recipients, setRecipients] = useState<Recipient[]>([]),
    [recipientsLoading, setRecipientsLoading] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [prepared, setPrepared] = useState<Prepared>(),
    [error, setError] = useState(""),
    [showErrors, setShowErrors] = useState(false),
    [busy, setBusy] = useState(false),
    [draftOpened, setDraftOpened] = useState<Prepared>();
  useEffect(() => {
    if (step !== 4) return;
    let cancelled = false;
    void (async () => {
      let localRecipient: Recipient | undefined;
      try {
        const localMlas = await loadLocalMlas();
        const mla = localMlas.find(
          (member) => member.constituency === student.constituency,
        );
        if (mla) {
          localRecipient = mlaAsRecipient(mla);
          if (!cancelled) {
            setRecipients([localRecipient]);
            setSelected([localRecipient.id]);
            setRecipientsLoading(false);
            setError("");
          }
        }
      } catch {
        /* The Firebase directory remains available below. */
      }

      try {
        const r = await httpsCallable<
          { constituency: string },
          { recipients: Recipient[] }
        >(functions, "listRecipients")({
          constituency: student.constituency,
        });
        if (cancelled) return;
        const remoteRecipients = r.data.recipients;
        const hasMla = remoteRecipients.some(
          (recipient) => recipient.recipientType === "mla",
        );
        const nextRecipients =
          localRecipient && !hasMla
            ? [...remoteRecipients, localRecipient]
            : remoteRecipients;
        if (nextRecipients.length) {
          setRecipients(nextRecipients);
          setSelected(nextRecipients.map((recipient) => recipient.id));
          setRecipientsLoading(false);
          setError("");
        } else if (!localRecipient) {
          throw new Error("No verified recipients found");
        }
      } catch {
        if (!cancelled && !localRecipient) {
          setRecipients([]);
          setSelected([]);
          setRecipientsLoading(false);
          setError(
            localized(
              lang,
              "Verified recipient list is currently unavailable.",
              "சரிபார்க்கப்பட்ட பெறுநர் பட்டியல் தற்போது கிடைக்கவில்லை.",
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, student.constituency, lang]);
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (student.name.trim().length < 2)
      e.name = localized(
        lang,
        "Enter your full name",
        "உங்கள் முழுப் பெயரை உள்ளிடவும்",
      );
    if (!/^\S+@\S+\.\S+$/.test(student.email))
      e.email = localized(
        lang,
        "Enter a valid email",
        "சரியான மின்னஞ்சலை உள்ளிடவும்",
      );
    if (!/^[6-9]\d{9}$/.test(student.mobile))
      e.mobile = localized(
        lang,
        "Enter a valid 10-digit Indian mobile number",
        "சரியான 10 இலக்க கைப்பேசி எண்ணை உள்ளிடவும்",
      );
    if (student.address.trim().length < 8)
      e.address = localized(
        lang,
        "Enter your house and street address",
        "வீட்டு மற்றும் தெரு முகவரியை உள்ளிடவும்",
      );
    if (!student.town) e.town = localized(lang, "Required", "கட்டாயம்");
    if (!student.district) e.district = localized(lang, "Required", "கட்டாயம்");
    if (student.state !== "Tamil Nadu") e.state = "Tamil Nadu address required";
    if (!/^\d{6}$/.test(student.pin))
      e.pin = localized(
        lang,
        "Enter a 6-digit PIN code",
        "6 இலக்க அஞ்சல் குறியீட்டை உள்ளிடவும்",
      );
    if (!student.exam) e.exam = localized(lang, "Required", "கட்டாயம்");
    if (!/^20\d{2}$/.test(student.examYear))
      e.examYear = localized(
        lang,
        "Enter a valid year",
        "சரியான ஆண்டை உள்ளிடவும்",
      );
    return e;
  }, [student, lang]);
  const next = async () => {
    setError("");
    if (step === 0 && Object.keys(errors).length) {
      setShowErrors(true);
      setError(
        localized(
          lang,
          "Please correct the highlighted fields.",
          "குறிக்கப்பட்டுள்ள விவரங்களைச் சரிசெய்யவும்.",
        ),
      );
      return;
    }
    if (step === 0) setShowErrors(false);
    if (step === 1 && !signature) {
      setError(
        localized(
          lang,
          "Please add your signature.",
          "உங்கள் கையொப்பத்தைச் சேர்க்கவும்.",
        ),
      );
      return;
    }
    if (step === 2 && !consents.every(Boolean)) {
      setError(
        localized(
          lang,
          "All consent statements are required.",
          "அனைத்து ஒப்புதல் அறிக்கைகளும் கட்டாயம்.",
        ),
      );
      return;
    }
    if (step === 3) {
      setRecipients([]);
      setSelected([]);
      setRecipientsLoading(true);
    }
    if (step === 4) {
      if (!selected.length) {
        setError(
          localized(
            lang,
            "Select at least one verified recipient.",
            "குறைந்தது ஒரு சரிபார்க்கப்பட்ட பெறுநரைத் தேர்ந்தெடுக்கவும்.",
          ),
        );
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
  const openEmailDraft = (service: "gmail" | "default") => {
    if (!prepared) return;
    prepared.attachments.forEach((attachment) =>
      downloadPdf(attachment.pdfBase64, attachment.fileName),
    );
    const url = emailDraftUrl(prepared, service);
    if (service === "gmail") window.open(url, "_blank", "noopener,noreferrer");
    else window.location.assign(url);
    setDraftOpened(prepared);
  };
  if (draftOpened)
    return <DraftReady lang={lang} prepared={draftOpened} onOpen={openEmailDraft} />;
  return (
    <div className="mx-auto max-w-5xl px-3 py-6 pb-28 sm:px-4 md:py-10">
      <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
        <span>
          {localized(
            lang,
            `Step ${step + 1} of ${steps.length}`,
            `படி ${step + 1} / ${steps.length}`,
          )}
        </span>
        <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
      </div>
      <div className="mb-7 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-green transition-all duration-500"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>
      <ol
        className="mb-7 flex snap-x gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible"
        aria-label="Progress"
      >
        {steps.map((s, i) => (
          <li
            key={s}
            className={`flex min-w-32 snap-start items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold md:min-w-0 md:flex-col md:border-0 md:bg-transparent md:text-center ${i === step ? "border-navy bg-navy text-white md:text-navy" : i < step ? "border-green/30 bg-emerald-50 text-green" : "border-slate-200 bg-white text-slate-400"}`}
            aria-current={i === step ? "step" : undefined}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i === step ? "bg-white text-navy" : i < step ? "bg-green text-white" : "bg-slate-200 text-slate-500"}`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span>{t(lang, s)}</span>
          </li>
        ))}
      </ol>
      <section className="card rounded-2xl border-0 p-4 shadow-xl shadow-slate-200/60 sm:p-7 md:p-9">
        <h1 className="text-xl font-bold text-navy sm:text-2xl">
          {t(lang, steps[step])}
        </h1>
        <p className="mb-7 mt-2 text-sm leading-6 text-slate-600 sm:text-base">
          {stepHelp[lang][step]}
        </p>
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
          >
            {error}
          </div>
        )}
        {step === 0 && (
          <Details
            lang={lang}
            value={student}
            set={setStudent}
            errors={showErrors ? errors : {}}
          />
        )}{" "}
        {step === 1 && (
          <SignaturePad lang={lang} value={signature} onChange={setSignature} />
        )}{" "}
        {step === 2 && (
          <div className="space-y-4">
            {consentText[lang].map((x, i) => (
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
              {localized(
                lang,
                "Consent version 1.0 · Your approval time is recorded securely.",
                "ஒப்புதல் பதிப்பு 1.0 · உங்கள் ஒப்புதல் நேரம் பாதுகாப்பாகப் பதிவு செய்யப்படும்.",
              )}
            </p>
          </div>
        )}{" "}
        {step === 3 && (
          <Preview lang={lang} student={student} signature={signature} />
        )}{" "}
        {step === 4 && (
          <RecipientSelect
            recipients={recipients}
            loading={recipientsLoading}
            selected={selected}
            set={setSelected}
            lang={lang}
          />
        )}{" "}
        {step === 5 && prepared && (
          <EmailReview lang={lang} prepared={prepared} />
        )}
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
            onClick={step === 5 ? () => openEmailDraft("gmail") : next}
          >
            {busy
              ? localized(lang, "Please wait…", "காத்திருக்கவும்…")
              : step === 5
                ? localized(
                    lang,
                    "Download PDFs & open Gmail draft",
                    "PDF-களைப் பதிவிறக்கி Gmail வரைவைத் திறக்கவும்",
                  )
                : t(lang, "continue")}
          </button>
        </div>
      </section>
    </div>
  );
}
function Details({
  lang,
  value,
  set,
  errors,
}: {
  lang: Lang;
  value: Student;
  set: (s: Student) => void;
  errors: Record<string, string>;
}) {
  const [mlas, setMlas] = useState<Mla[]>([]),
    [mlaStatus, setMlaStatus] = useState<"loading" | "ready" | "error">(
      "loading",
    ),
    [localities, setLocalities] = useState<string[]>([]),
    [postalStatus, setPostalStatus] = useState("");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let localDirectoryLoaded = false;
      try {
        const localMlas = await loadLocalMlas();
        localDirectoryLoaded = true;
        if (!cancelled) {
          setMlas(localMlas);
          setMlaStatus("ready");
        }
      } catch {
        /* The verified Firebase directory remains available as a fallback. */
      }

      try {
        const response = await httpsCallable<undefined, { mlas: Mla[] }>(
          functions,
          "listMlas",
        )();
        if (!cancelled && response.data.mlas.length) {
          setMlas(response.data.mlas);
          setMlaStatus("ready");
        }
      } catch {
        if (!cancelled && !localDirectoryLoaded) {
          setMlas([]);
          setMlaStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!/^6\d{5}$/.test(value.pin)) return;
    const timer = window.setTimeout(() => {
      setPostalStatus(
        localized(
          lang,
          "Looking up postal address…",
          "அஞ்சல் முகவரியைத் தேடுகிறது…",
        ),
      );
      void lookupPostalAddress(value.pin)
        .then((r) => {
          setLocalities(r.localities);
          set({
            ...value,
            town: r.localities.includes(value.town)
              ? value.town
              : r.localities[0],
            district: r.district,
            state: r.state,
            constituency: "",
          });
          setPostalStatus(
            localized(
              lang,
              "Address found. Please confirm your locality.",
              "முகவரி கண்டறியப்பட்டது. உங்கள் ஊரை உறுதிப்படுத்தவும்.",
            ),
          );
        })
        .catch(() =>
          setPostalStatus(
            localized(
              lang,
              "Postal lookup unavailable. Enter the address manually.",
              "அஞ்சல் முகவரி சேவை தற்போது கிடைக்கவில்லை. முகவரியை உள்ளிடவும்.",
            ),
          ),
        );
    }, 350);
    return () => window.clearTimeout(timer);
    // The lookup must rerun only when PIN changes; including the populated address would create a request loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.pin, lang]);
  const selectedMla = mlas.find((x) => x.constituency === value.constituency);
  const districtMlas = value.district
    ? mlas.filter(
        (mla) => districtKey(mla.district) === districtKey(value.district),
      )
    : [];
  const fields: [keyof Student, string, string?][] = [
    ["name", localized(lang, "Full name", "முழுப் பெயர்")],
    ["email", localized(lang, "Email address", "மின்னஞ்சல் முகவரி"), "email"],
    ["mobile", localized(lang, "Mobile number", "கைப்பேசி எண்"), "tel"],
    [
      "address",
      localized(lang, "House and street address", "வீட்டு மற்றும் தெரு முகவரி"),
    ],
    ["exam", localized(lang, "Examination applied for", "விண்ணப்பித்த தேர்வு")],
    ["examYear", localized(lang, "Examination year", "தேர்வு ஆண்டு")],
    [
      "registration",
      localized(
        lang,
        "Candidate registration number (optional)",
        "விண்ணப்பப் பதிவு எண் (விருப்பம்)",
      ),
    ],
    [
      "dob",
      localized(lang, "Date of birth (optional)", "பிறந்த தேதி (விருப்பம்)"),
      "date",
    ],
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map(([k, l, type]) => (
        <label key={k} className={k === "address" ? "md:col-span-2" : ""}>
          <span className="label">{l}</span>
          {k === "mobile" ? (
            <span
              className={`flex overflow-hidden rounded-xl border bg-white focus-within:border-green focus-within:ring-2 focus-within:ring-green/20 ${errors.mobile ? "border-red-500" : "border-slate-300"}`}
            >
              <span
                className="flex shrink-0 items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 font-semibold text-navy sm:px-4"
                aria-hidden="true"
              >
                <span className="text-xl">🇮🇳</span>
                <span>+91</span>
              </span>
              <input
                className="min-h-12 min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-base outline-none sm:px-4"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                value={value.mobile}
                placeholder="10-digit mobile number"
                onChange={(e) =>
                  set({
                    ...value,
                    mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                aria-label={localized(
                  lang,
                  "Indian mobile number",
                  "இந்திய கைப்பேசி எண்",
                )}
                aria-invalid={!!errors.mobile}
                aria-describedby={errors.mobile ? "mobile-error" : undefined}
              />
            </span>
          ) : (
            <input
              className={`field ${errors[k] ? "border-red-500" : ""}`}
              type={type || "text"}
              value={value[k]}
              placeholder={
                k === "email"
                  ? localized(
                      lang,
                      "you@example.com",
                      "you@example.com",
                    )
                  : undefined
              }
              onChange={(e) => set({ ...value, [k]: e.target.value })}
              maxLength={k === "address" ? 300 : 100}
              aria-invalid={!!errors[k]}
              aria-describedby={errors[k] ? `${k}-error` : undefined}
            />
          )}
          {errors[k] && (
            <span id={`${k}-error`} className="mt-1 block text-sm text-red-700">
              {errors[k]}
            </span>
          )}
        </label>
      ))}
      <label>
        <span className="label">
          {localized(lang, "PIN code", "அஞ்சல் குறியீடு")}
        </span>
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
        <span className="label">
          {localized(lang, "Village or town", "கிராமம் அல்லது நகரம்")}
        </span>
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
        <span className="label">{localized(lang, "District", "மாவட்டம்")}</span>
        <input
          className="field bg-slate-100"
          value={value.district}
          readOnly={localities.length > 0}
          onChange={(e) =>
            set({ ...value, district: e.target.value, constituency: "" })
          }
        />
      </label>
      <label>
        <span className="label">{localized(lang, "State", "மாநிலம்")}</span>
        <input className="field bg-slate-100" value={value.state} readOnly />
      </label>
      <label className="sm:col-span-2">
        <span className="label">
          {localized(
            lang,
            "Select your Assembly constituency and MLA",
            "உங்கள் சட்டமன்றத் தொகுதி மற்றும் உறுப்பினரைத் தேர்ந்தெடுக்கவும்",
          )}
        </span>
        <select
          className="field"
          value={value.constituency}
          onChange={(e) => set({ ...value, constituency: e.target.value })}
          disabled={!value.district || districtMlas.length === 0}
        >
          <option value="">
            {localized(
              lang,
              !value.district
                ? "Enter your PIN code first"
                : mlaStatus === "loading"
                  ? "Please wait — fetching constituency and MLA details…"
                  : mlaStatus === "error"
                    ? "MLA directory is temporarily unavailable"
                    : `Select from ${value.district} district`,
              !value.district
                ? "முதலில் அஞ்சல் குறியீட்டை உள்ளிடவும்"
                : mlaStatus === "loading"
                  ? "தயவுசெய்து காத்திருக்கவும் — தொகுதி மற்றும் MLA விவரங்கள் பெறப்படுகின்றன…"
                  : mlaStatus === "error"
                    ? "MLA பட்டியல் தற்போது கிடைக்கவில்லை"
                    : `${value.district} மாவட்டத்திலிருந்து தேர்ந்தெடுக்கவும்`,
            )}
          </option>
          {districtMlas.map((x) => (
            <option key={x.id} value={x.constituency}>
              {x.name} — {x.constituency}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-sm text-slate-500">
          {localized(
            lang,
            mlaStatus === "loading"
              ? "Please wait — fetching your Assembly constituency list and MLA email IDs."
              : mlaStatus === "error"
                ? "The MLA directory could not be loaded. Refresh the page and try again."
                : districtMlas.length
              ? `${districtMlas.length} Assembly representatives are listed for this district. Confirm your constituency carefully.`
              : value.district
                ? `No verified Assembly representatives were found for ${value.district}. Check the district name or retry the PIN code.`
                : "Representatives will appear after the postal district is identified.",
            mlaStatus === "loading"
              ? "தயவுசெய்து காத்திருக்கவும் — உங்கள் தொகுதிப் பட்டியல் மற்றும் MLA மின்னஞ்சல் முகவரிகள் பெறப்படுகின்றன."
              : mlaStatus === "error"
                ? "MLA பட்டியலை ஏற்ற முடியவில்லை. பக்கத்தைப் புதுப்பித்து மீண்டும் முயற்சிக்கவும்."
                : districtMlas.length
              ? `இந்த மாவட்டத்தில் ${districtMlas.length} சட்டமன்ற உறுப்பினர்கள் பட்டியலிடப்பட்டுள்ளனர். உங்கள் தொகுதியை கவனமாக உறுதிப்படுத்தவும்.`
              : value.district
                ? `${value.district} மாவட்டத்திற்கு சரிபார்க்கப்பட்ட சட்டமன்ற உறுப்பினர்கள் கிடைக்கவில்லை. மாவட்டப் பெயரைச் சரிபார்க்கவும் அல்லது PIN குறியீட்டை மீண்டும் முயற்சிக்கவும்.`
                : "அஞ்சல் மாவட்டம் கண்டறியப்பட்டதும் உறுப்பினர்கள் காண்பிக்கப்படுவார்கள்.",
          )}
        </span>
      </label>
      {selectedMla && (
        <aside
          className="sm:col-span-2 overflow-hidden rounded-2xl border border-green/30 bg-green/5 p-4 sm:p-5"
          aria-live="polite"
        >
          <div className="flex items-start gap-4">
            <img
              src={selectedMla.photoUrl}
              alt={`${selectedMla.name}, MLA for ${selectedMla.constituency}`}
              className="h-28 w-24 shrink-0 rounded-xl border border-white bg-white object-cover shadow-sm sm:h-36 sm:w-28"
              loading="lazy"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-green sm:text-sm">
                {localized(
                  lang,
                  "Confirm your MLA",
                  "உங்கள் சட்டமன்ற உறுப்பினரை உறுதிப்படுத்தவும்",
                )}
              </p>
              <p className="mt-2 text-lg font-bold text-navy sm:text-xl">
                {selectedMla.name}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {selectedMla.constituency} · {selectedMla.district}
              </p>
              <p className="mt-2 break-all text-sm text-slate-700" aria-live="polite">
                <span className="font-semibold">
                  {localized(lang, "MLA email: ", "MLA மின்னஞ்சல்: ")}
                </span>
                {selectedMla.email ||
                  localized(
                    lang,
                    "Please wait — fetching your MLA email ID…",
                    "தயவுசெய்து காத்திருக்கவும் — உங்கள் MLA மின்னஞ்சல் முகவரி பெறப்படுகிறது…",
                  )}
              </p>
              <a
                className="mt-3 inline-block text-sm font-semibold text-green underline"
                href={selectedMla.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {localized(
                  lang,
                  "Verified 17th Assembly source",
                  "17வது சட்டமன்ற ஆதாரத்தில் சரிபார்க்கப்பட்டது",
                )}
              </a>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
function Preview({
  lang,
  student,
  signature,
}: {
  lang: Lang;
  student: Student;
  signature: string;
}) {
  return (
    <div>
      <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        {localized(
          lang,
          "The official petition is generated in Tamil. Verify your personal details below.",
          "அதிகாரப்பூர்வ மனு தமிழில் உருவாக்கப்படும். கீழே உங்கள் தனிப்பட்ட விவரங்களைச் சரிபார்க்கவும்.",
        )}
      </div>
      <div className="rounded-xl border bg-white p-5 leading-8">
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
          <b>பொருள்:</b> காவல்துறை ஆட்சேர்ப்பு முடிவுகள், 2026 PC/SI
          அறிவிப்புகள் மற்றும் வயது தளர்வு கோருதல்.
        </p>
        <p className="mt-4">
          மதிப்பிற்குரிய ஐயா/அம்மையீர், காவல்துறையில் பணியாற்ற ஆவலுடன்
          தயாராகிவரும் விண்ணப்பதாரர்கள் சார்பாக, நிலுவையில் உள்ள தேர்வு
          முடிவுகளை விரைந்து வெளியிடவும், 2026 ஆம் ஆண்டுக்கான இரண்டாம் நிலைக்
          காவலர் மற்றும் சார்பு ஆய்வாளர் ஆட்சேர்ப்பு அறிவிப்புகளை விரைவில்
          வெளியிடவும், அறிவிப்பு மற்றும் தேர்வு தாமதங்களால் வயது வரம்பை இழந்த
          விண்ணப்பதாரர்களுக்கு உரிய வயது தளர்வு வழங்கவும் பணிவுடன்
          கேட்டுக்கொள்கிறேன்.
        </p>
        <img
          src={signature}
          alt="Applicant signature"
          className="mt-6 h-20 max-w-52 object-contain"
        />
        <p>{student.name}</p>
      </div>
    </div>
  );
}
function RecipientSelect({
  lang,
  recipients,
  loading,
  selected,
  set,
}: {
  lang: Lang;
  recipients: Recipient[];
  loading: boolean;
  selected: string[];
  set: (x: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <p className="font-bold">
          {localized(lang, "Official CC copies", "அதிகாரப்பூர்வ CC பிரதிகள்")}
        </p>
        <p className="mt-1 text-blue-800">
          {localized(
            lang,
            "These recipients are included automatically with every petition.",
            "இந்தப் பெறுநர்கள் ஒவ்வொரு மனுவிலும் தானாகச் சேர்க்கப்படுவர்.",
          )}
        </p>
        <ul className="mt-3 space-y-1">
          {mandatoryCcRecipients.map((recipient) => (
            <li key={recipient.email} className="break-all">
              <span className="font-semibold">{recipient.department}</span> (CC) · {recipient.email}
            </li>
          ))}
        </ul>
      </aside>
      {loading ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900" role="status">
          {localized(
            lang,
            "Please wait — fetching your verified MLA email ID…",
            "தயவுசெய்து காத்திருக்கவும் — உங்கள் சரிபார்க்கப்பட்ட MLA மின்னஞ்சல் முகவரி பெறப்படுகிறது…",
          )}
        </p>
      ) : recipients.length === 0 ? (
        <p>
          {localized(
            lang,
            "No active, officially verified recipients are configured yet.",
            "செயலில் உள்ள சரிபார்க்கப்பட்ட பெறுநர்கள் இன்னும் அமைக்கப்படவில்லை.",
          )}
        </p>
      ) : (
        recipients.map((r) => (
          <label
            className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${selected.includes(r.id) ? "border-green bg-emerald-50/60" : "border-slate-200 hover:border-slate-300"}`}
            key={r.id}
          >
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
                {localized(
                  lang,
                  "Officially verified",
                  "அதிகாரப்பூர்வமாக சரிபார்க்கப்பட்டது",
                )}{" "}
                · {r.delivery.toUpperCase()} · {r.lastVerifiedDate}
              </span>
              <span className="mt-2 block break-all text-sm font-semibold text-navy">
                {localized(lang, "Email: ", "மின்னஞ்சல்: ")}
                {r.email}
              </span>
            </span>
          </label>
        ))
      )}
    </div>
  );
}
function EmailReview({ lang, prepared }: { lang: Lang; prepared: Prepared }) {
  return (
    <div>
      <dl className="grid gap-2">
        <dt className="font-bold">
          {localized(lang, "Recipients", "பெறுநர்கள்")}
        </dt>
        <dd>
          {prepared.recipients
            .map((r) => `${r.departmentName} (${r.delivery.toUpperCase()})`)
            .join(", ")}
        </dd>
        <dt className="mt-3 font-bold">
          {localized(lang, "Subject", "பொருள்")}
        </dt>
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
            {attachment.kind === "mla"
              ? localized(lang, "MLA petition", "சட்டமன்ற உறுப்பினர் மனு")
              : localized(lang, "Government petition", "அரசுத் துறை மனு")}
            : {attachment.departmentName}
          </button>
        ))}
      </div>
    </div>
  );
}
function DraftReady({
  lang,
  prepared,
  onOpen,
}: {
  lang: Lang;
  prepared: Prepared;
  onOpen: (service: "gmail" | "default") => void;
}) {
  return (
    <div className="card mx-auto my-12 max-w-2xl text-center">
      <div className="text-5xl">✉</div>
      <h1 className="mt-4 text-2xl font-bold text-green sm:text-3xl">
        {localized(
          lang,
          "Your email draft is ready",
          "உங்கள் மின்னஞ்சல் வரைவு தயாராக உள்ளது",
        )}
      </h1>
      <p className="mt-5 text-xl font-bold">{prepared.reference}</p>
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm leading-6 text-emerald-950">
        <p className="font-bold">Attach the downloaded PDF, then press Send yourself.</p>
        <p className="mt-1">
          No Google account permission was requested. The site cannot confirm delivery because the final sending happens in your own email app.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="btn-primary" onClick={() => onOpen("gmail")}>
          Download PDFs & open Gmail
        </button>
        <button className="btn-secondary" onClick={() => onOpen("default")}>
          Open default email app
        </button>
        {prepared.attachments.map((attachment) => (
          <button
            key={attachment.fileName}
            className="btn-secondary"
            onClick={() =>
              downloadPdf(attachment.pdfBase64, attachment.fileName)
            }
          >
            {localized(lang, "Download", "பதிவிறக்கவும்")}{" "}
            {attachment.kind === "mla"
              ? "MLA"
              : localized(lang, "Government", "அரசு")}{" "}
            PDF
          </button>
        ))}
        <button className="btn-primary" onClick={() => window.print()}>
          {localized(lang, "Print petition record", "மனு பதிவை அச்சிடவும்")}
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
