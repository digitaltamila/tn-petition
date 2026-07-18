import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FilePenLine,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Lang } from "../types";
import { landingCopy, localized, t } from "../i18n";

export function Landing({ lang }: { lang: Lang }) {
  const c = landingCopy[lang];
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-green/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-100 sm:text-sm">
              <Sparkles size={16} />
              {c.eyebrow}
            </div>
            <h1 className="mt-6 max-w-3xl text-3xl font-bold leading-[1.2] sm:text-4xl lg:text-5xl">
              {c.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              {c.heroText}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className="btn min-h-14 gap-2 bg-white text-navy hover:bg-emerald-50"
                to="/petition"
              >
                {t(lang, "start")}
                <ArrowRight size={19} />
              </Link>
              <span className="text-sm text-slate-300">{t(lang, "own")}</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/20">
                <FilePenLine className="text-emerald-200" />
              </div>
              <h2 className="text-xl font-bold">{c.requestsTitle}</h2>
            </div>
            <ol className="space-y-3">
              {c.requests.map((request, index) => (
                <li
                  key={request}
                  className="flex gap-3 rounded-xl bg-white/10 p-4"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400 font-bold text-navy">
                    {index + 1}
                  </span>
                  <span className="leading-7 text-slate-100">{request}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-[.2em] text-green">
              {localized(
                lang,
                "About this service",
                "இந்தச் சேவையைப் பற்றி",
              )}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-navy sm:text-3xl">
              {localized(
                lang,
                "Purpose of this application",
                "இந்தச் செயலியின் நோக்கம்",
              )}
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              {localized(
                lang,
                "This independent public-interest web application by Muppadai Training Academy is intended for Tamil Nadu police recruitment aspirants. It helps one applicant at a time prepare a personalised representation about pending recruitment results, 2026 PC and SI notifications, and age relaxation, and send it to relevant public officials selected from the applicant’s location.",
                "முப்படை பயிற்சி அகாடமியின் இந்தச் சுயாதீன பொதுநல இணையச் செயலி தமிழ்நாடு காவல்துறை ஆட்சேர்ப்புத் தேர்வர்களுக்கானது. நிலுவைத் தேர்வு முடிவுகள், 2026 PC மற்றும் SI அறிவிப்புகள், வயது தளர்வு ஆகியவை தொடர்பான தனிப்பட்ட மனுவை ஒவ்வொரு விண்ணப்பதாரரும் தயாரித்து, தங்கள் இருப்பிடத்தின் அடிப்படையில் தேர்ந்தெடுக்கப்பட்ட உரிய பொது அதிகாரிகளுக்கு அனுப்ப உதவுகிறது.",
              )}
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy/10">
                  <FilePenLine className="text-navy" size={22} />
                </div>
                <h3 className="text-xl font-bold text-navy">
                  {localized(lang, "What the applicant does", "விண்ணப்பதாரர் செய்வது")}
                </h3>
              </div>
              <p className="mt-4 leading-7 text-slate-600">
                {localized(
                  lang,
                  "The applicant enters their own details, adds a signature and consent, reviews the complete petition PDF, verifies the recipients and approves the final email. Nothing is sent automatically, and the service does not support bulk sending.",
                  "விண்ணப்பதாரர் தமது சொந்த விவரங்களை உள்ளிட்டு, கையொப்பம் மற்றும் ஒப்புதலைச் சேர்த்து, முழு மனு PDF, பெறுநர்கள் மற்றும் இறுதி மின்னஞ்சலை ஆய்வு செய்கிறார். எதுவும் தானாக அனுப்பப்படாது; மொத்த அனுப்புதல் ஆதரிக்கப்படாது.",
                )}
              </p>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-green/10">
                  <MailCheck className="text-green" size={22} />
                </div>
                <h3 className="text-xl font-bold text-navy">
                  {localized(
                    lang,
                    "How sending works",
                    "அனுப்பும் நடைமுறை",
                  )}
                </h3>
              </div>
              <p className="mt-4 leading-7 text-slate-600">
                {localized(
                  lang,
                  "After you review the petition, download the PDF and open the prepared email draft. Attach the PDF, check the recipients and press Send from your own email app.",
                  "மனுவை ஆய்வு செய்த பிறகு PDF-ஐப் பதிவிறக்கி தயாரான மின்னஞ்சல் வரைவைத் திறக்கவும். PDF-ஐ இணைத்து, பெறுநர்களைச் சரிபார்த்து, உங்கள் மின்னஞ்சல் செயலியில் அனுப்பு என்பதை அழுத்தவும்.",
                )}
              </p>
            </article>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold">
            <Link className="text-green hover:underline" to="/privacy">
              {localized(lang, "Privacy policy", "தனியுரிமைக் கொள்கை")}
            </Link>
            <Link className="text-green hover:underline" to="/terms">
              {localized(lang, "Terms of use", "பயன்பாட்டு விதிகள்")}
            </Link>
            <Link className="text-green hover:underline" to="/contact">
              {localized(lang, "Contact", "தொடர்பு")}
            </Link>
            <a
              className="text-slate-600 hover:text-green hover:underline"
              href="mailto:info@muppadaitrainingacademy.com"
            >
              info@muppadaitrainingacademy.com
            </a>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            {localized(
              lang,
              "This is an independent initiative and is not affiliated with, operated by or endorsed by the Tamil Nadu Government.",
              "இது ஒரு சுயாதீன முயற்சி; தமிழ்நாடு அரசுடன் இணைக்கப்பட்டதோ, அரசால் இயக்கப்படுவதோ அல்லது அங்கீகரிக்கப்பட்டதோ அல்ல.",
            )}
          </p>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-[.2em] text-green">
              {localized(lang, "How it works", "இது எவ்வாறு செயல்படுகிறது")}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-navy sm:text-3xl">
              {c.processTitle}
            </h2>
            <p className="mt-4 leading-7 text-slate-600">{c.processText}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.process.map(([number, title, description]) => (
              <article
                key={number}
                className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-green/40 hover:bg-white hover:shadow-xl"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy font-bold text-white">
                  {number}
                </span>
                <h3 className="mt-5 text-lg font-bold text-navy">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-emerald-50/70 py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green/10">
                <ShieldCheck className="text-green" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-navy">
                  {c.safetyTitle}
                </h2>
                <p className="mt-3 leading-7 text-slate-600">{c.safetyText}</p>
                <ul className="mt-5 space-y-3 text-sm font-semibold text-slate-700">
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-green" size={20} />
                    {localized(
                      lang,
                      "No automatic or bulk sending",
                      "தானியங்கி அல்லது மொத்த அனுப்புதல் இல்லை",
                    )}
                  </li>
                  <li className="flex gap-2">
                    <MailCheck className="text-green" size={20} />
                    {localized(
                      lang,
                      "Final approval always belongs to you",
                      "இறுதி ஒப்புதல் எப்போதும் உங்களுடையது",
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="px-2">
            <img
              src="/muppadai-logo.png"
              alt="Muppadai Training Academy logo"
              className="mb-5 h-24 w-24 object-contain"
            />
            <p className="text-sm font-bold uppercase tracking-[.2em] text-green">
              {localized(lang, "Initiative by", "முன்னெடுப்பு")}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-navy">
              Muppadai Training Academy
            </h2>
            <p className="mt-4 leading-7 text-slate-600">{c.disclaimer}</p>
            <Link
              to="/disclaimer"
              className="mt-5 inline-flex items-center gap-2 font-semibold text-green hover:underline"
            >
              {localized(
                lang,
                "Read disclaimer",
                "பொறுப்புத்துறப்பைப் படிக்கவும்",
              )}{" "}
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
