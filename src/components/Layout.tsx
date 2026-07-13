import { Link } from "react-router-dom";
import type { Lang } from "../types";
import { t } from "../i18n";
import { firebaseConfigured } from "../firebase";
export function Layout({
  lang,
  setLang,
  children,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <Link
            to="/"
            className="max-w-[72%] text-sm font-bold leading-tight text-navy sm:text-base"
          >
            {t(lang, "title")}
          </Link>
          <button
            className="btn-secondary min-h-10 shrink-0 px-3 py-2 text-sm"
            onClick={() => setLang(lang === "ta" ? "en" : "ta")}
            aria-label="Change language"
          >
            {lang === "ta" ? "English" : "தமிழ்"}
          </button>
        </div>
      </header>
      {!firebaseConfigured && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900 sm:text-sm">
          UI preview mode — Firebase, PDF and Gmail actions are not connected.
        </div>
      )}
      <main>{children}</main>
      <footer className="mt-12 border-t bg-navy text-slate-200">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 text-sm md:grid-cols-2">
          <p>{t(lang, "independent")}</p>
          <nav className="flex flex-wrap gap-4 md:justify-end">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/disclaimer">Disclaimer</Link>
            <Link to="/deletion">Data deletion</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
