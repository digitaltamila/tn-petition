import { useEffect, useRef } from "react";
import type { Lang } from "../types";
import { localized } from "../i18n";

export function Modal({
  lang,
  open,
  onClose,
  onConfirm,
  busy,
}: {
  lang: Lang;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
    const escape = (event: KeyboardEvent) =>
      event.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, busy, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-2xl">
          !
        </div>
        <h2
          id="confirm-title"
          className="mt-4 text-center text-xl font-bold text-navy sm:text-2xl"
        >
          {localized(lang, "Final confirmation", "இறுதி உறுதிப்படுத்தல்")}
        </h2>
        <p className="my-5 text-center leading-7 text-slate-600">
          {localized(
            lang,
            "You are about to send this petition from your Gmail account to the selected government recipients. This action cannot be undone.",
            "தேர்ந்தெடுக்கப்பட்ட அரசு பெறுநர்களுக்கு உங்கள் Gmail கணக்கிலிருந்து இந்த மனுவை அனுப்ப உள்ளீர்கள். அனுப்பிய பிறகு இதைத் திரும்பப் பெற முடியாது.",
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            ref={ref}
            disabled={busy}
            className="btn-secondary"
            onClick={onClose}
          >
            {localized(lang, "Cancel", "ரத்து செய்")}
          </button>
          <button disabled={busy} className="btn-primary" onClick={onConfirm}>
            {busy
              ? localized(lang, "Sending…", "அனுப்புகிறது…")
              : localized(lang, "Send petition", "மனுவை அனுப்பு")}
          </button>
        </div>
      </div>
    </div>
  );
}
