import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, firebaseConfigured, functions } from "../firebase";
import { SignaturePad } from "../components/SignaturePad";
import { Modal } from "../components/Modal";
import type { Draft, Lang, Mla, Prepared, Recipient, Student } from "../types";
import { localized, t } from "../i18n";
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
    "I authorise this application to send this specific email from my Gmail account only after I review and approve it.",
    "I understand that this application is not affiliated with the Tamil Nadu Government.",
  ],
  ta: [
    "நான் உள்ளிட்ட தகவல்கள் சரியானவை என்பதை உறுதிப்படுத்துகிறேன்.",
    "எனது விவரங்கள் மற்றும் கையொப்பத்தைப் பயன்படுத்தி இந்த மனுவை உருவாக்க அனுமதிக்கிறேன்.",
    "நான் ஆய்வு செய்து ஒப்புதல் அளித்த பிறகு மட்டுமே, இந்த குறிப்பிட்ட மின்னஞ்சலை எனது Gmail கணக்கிலிருந்து அனுப்ப அனுமதிக்கிறேன்.",
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
    "Review the exact email and attachments before signing in.",
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
    [selected, setSelected] = useState<string[]>([]),
    [prepared, setPrepared] = useState<Prepared>(),
    [error, setError] = useState(""),
    [showErrors, setShowErrors] = useState(false),
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
          setError(
            localized(
              lang,
              "Verified recipient list is currently unavailable.",
              "சரிபார்க்கப்பட்ட பெறுநர் பட்டியல் தற்போது கிடைக்கவில்லை.",
            ),
          );
        }
      })();
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
  if (success) return <Success lang={lang} data={success} />;
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
            onClick={step === 5 ? () => setModal(true) : next}
          >
            {busy
              ? localized(lang, "Please wait…", "காத்திருக்கவும்…")
              : step === 5
                ? localized(
                    lang,
                    "Review and send petition",
                    "ஆய்வு செய்து மனுவை அனுப்பவும்",
                  )
                : t(lang, "continue")}
          </button>
        </div>
      </section>
      <Modal
        lang={lang}
        open={modal}
        onClose={() => setModal(false)}
        onConfirm={send}
        busy={busy}
      />
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
          onChange={(e) => set({ ...value, district: e.target.value })}
        />
      </label>
      <label>
        <span className="label">{localized(lang, "State", "மாநிலம்")}</span>
        <input className="field bg-slate-100" value={value.state} readOnly />
      </label>
      <label className="sm:col-span-2">
        <span className="label">
          {localized(lang, "Assembly constituency", "சட்டமன்றத் தொகுதி")}
        </span>
        <select
          className="field"
          value={value.constituency}
          onChange={(e) => set({ ...value, constituency: e.target.value })}
        >
          <option value="">
            {localized(
              lang,
              "Select your constituency",
              "உங்கள் தொகுதியைத் தேர்ந்தெடுக்கவும்",
            )}
          </option>
          {mlas.map((x) => (
            <option key={x.id} value={x.constituency}>
              {x.constituency}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-sm text-slate-500">
          {localized(
            lang,
            "PIN codes may cover more than one constituency. Please confirm your selection.",
            "ஒரு அஞ்சல் குறியீடு ஒன்றுக்கு மேற்பட்ட தொகுதிகளை உள்ளடக்கலாம். உங்கள் தேர்வை உறுதிப்படுத்தவும்.",
          )}
        </span>
      </label>
      {selectedMla && (
        <aside
          className="sm:col-span-2 rounded-xl border border-green/30 bg-green/5 p-4"
          aria-live="polite"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-green">
            {localized(lang, "Your MLA", "உங்கள் சட்டமன்ற உறுப்பினர்")}
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
            {localized(
              lang,
              "Verified Assembly source",
              "சட்டமன்ற ஆதாரத்தில் சரிபார்க்கப்பட்டது",
            )}
          </a>
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
  selected,
  set,
}: {
  lang: Lang;
  recipients: Recipient[];
  selected: string[];
  set: (x: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      {recipients.length === 0 ? (
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
function Success({
  lang,
  data,
}: {
  lang: Lang;
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
      <h1 className="mt-4 text-2xl font-bold text-green sm:text-3xl">
        {localized(
          lang,
          "Petition sent successfully",
          "மனு வெற்றிகரமாக அனுப்பப்பட்டது",
        )}
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
            {localized(lang, "Download", "பதிவிறக்கவும்")}{" "}
            {attachment.kind === "mla"
              ? "MLA"
              : localized(lang, "Government", "அரசு")}{" "}
            PDF
          </button>
        ))}
        <button className="btn-primary" onClick={() => window.print()}>
          {localized(lang, "Print acknowledgement", "ஒப்புகையை அச்சிடவும்")}
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
