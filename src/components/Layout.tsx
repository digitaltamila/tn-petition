import { Link } from "react-router-dom";
import type { Lang } from "../types";
import { localized, t } from "../i18n";
import { firebaseConfigured } from "../firebase";

function Brand({ lang }: { lang: Lang }) {
  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2 sm:gap-3"
      aria-label="Muppadai Training Academy home"
    >
      <img
        src="/muppadai-logo.png"
        alt="Muppadai Training Academy logo"
        className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
      />
      <span className="min-w-0 leading-tight">
        <strong className="block truncate text-xs text-navy min-[380px]:text-sm sm:text-base">
          Muppadai Training Academy
        </strong>
        <span className="hidden text-[10px] font-semibold uppercase tracking-[.1em] text-green min-[380px]:block sm:text-xs">
          {localized(lang, "Public initiative", "பொதுநல முயற்சி")}
        </span>
      </span>
    </Link>
  );
}

export function Layout({
  lang,
  setLang,
  children,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <Brand lang={lang} />
          <button
            className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-navy transition hover:border-green hover:bg-emerald-50 sm:px-3 sm:text-sm"
            onClick={() => setLang(lang === "ta" ? "en" : "ta")}
            aria-label={localized(lang, "Switch to Tamil", "Switch to English")}
          >
            {lang === "ta" ? "English" : "தமிழ்"}
          </button>
        </div>
      </header>
      {!firebaseConfigured && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900 sm:text-sm">
          {localized(
            lang,
            "Preview mode — secure submission is unavailable in this build.",
            "முன்னோட்ட முறை — இந்தப் பதிப்பில் பாதுகாப்பான சமர்ப்பிப்பு கிடைக்காது.",
          )}
        </div>
      )}
      <main>{children}</main>
      <footer className="mt-0 bg-navy text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 border-b border-white/10 pb-8 md:grid-cols-[1.3fr_.7fr]">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src="/muppadai-logo.png"
                  alt="Muppadai Training Academy logo"
                  className="h-16 w-16 shrink-0 rounded-xl bg-white/95 p-1 object-contain"
                />
                <div>
                  <strong className="block text-white">
                    Muppadai Training Academy
                  </strong>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    {localized(lang, "Public initiative", "பொதுநல முயற்சி")}
                  </span>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
                {t(lang, "independent")}
              </p>
            </div>
            <nav className="grid grid-cols-2 gap-3 text-sm md:justify-self-end">
              <Link className="hover:text-white" to="/privacy">
                {localized(lang, "Privacy policy", "தனியுரிமை")}
              </Link>
              <Link className="hover:text-white" to="/terms">
                {localized(lang, "Terms of use", "பயன்பாட்டு விதிகள்")}
              </Link>
              <Link className="hover:text-white" to="/disclaimer">
                {localized(lang, "Disclaimer", "பொறுப்புத்துறப்பு")}
              </Link>
              <Link className="hover:text-white" to="/deletion">
                {localized(lang, "Data deletion", "தரவு நீக்கம்")}
              </Link>
              <Link className="hover:text-white" to="/contact">
                {localized(lang, "Contact", "தொடர்பு")}
              </Link>
            </nav>
          </div>
          <p className="pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} Muppadai Training Academy.{" "}
            {localized(
              lang,
              "Independent public-interest initiative.",
              "சுயாதீன பொதுநல முயற்சி.",
            )}
          </p>
        </div>
      </footer>
    </>
  );
}
