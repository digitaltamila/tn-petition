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
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.15] sm:text-5xl lg:text-6xl">
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

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-[.2em] text-green">
              {localized(lang, "How it works", "இது எவ்வாறு செயல்படுகிறது")}
            </span>
            <h2 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
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
