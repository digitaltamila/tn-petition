import { useEffect, useRef } from "react";
import SignaturePadLib from "signature_pad";
import type { Lang } from "../types";
import { localized } from "../i18n";

export function SignaturePad({
  lang,
  value,
  onChange,
}: {
  lang: Lang;
  value: string;
  onChange: (value: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    pad = useRef<SignaturePadLib | undefined>(undefined);
  useEffect(() => {
    const c = canvas.current!;
    const resize = () => {
      const saved = pad.current?.toData(),
        ratio = Math.max(devicePixelRatio || 1, 1);
      c.width = c.offsetWidth * ratio;
      c.height = 220 * ratio;
      c.getContext("2d")!.scale(ratio, ratio);
      pad.current?.clear();
      if (saved?.length) pad.current?.fromData(saved);
    };
    pad.current = new SignaturePadLib(c, { minWidth: 1, maxWidth: 2.5 });
    pad.current.addEventListener("endStroke", () =>
      onChange(pad.current!.toDataURL("image/png")),
    );
    resize();
    window.addEventListener("resize", resize);
    if (value) pad.current.fromDataURL(value);
    return () => window.removeEventListener("resize", resize);
  }, [onChange, value]);
  return (
    <div>
      <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-slate-700">
        {localized(
          lang,
          "Sign naturally inside the box using your finger, stylus or mouse.",
          "உங்கள் விரல், தொடுதிரைப் பேனா அல்லது சுட்டியைப் பயன்படுத்தி பெட்டிக்குள் இயல்பாக கையொப்பமிடவும்.",
        )}
      </div>
      <canvas
        ref={canvas}
        className="h-[220px] w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-inner"
        aria-label={localized(
          lang,
          "Signature drawing area",
          "கையொப்பம் வரையும் பகுதி",
        )}
      />
      <button
        type="button"
        className="btn-secondary mt-3"
        onClick={() => {
          pad.current?.clear();
          onChange("");
        }}
      >
        {localized(lang, "Clear signature", "கையொப்பத்தை அழிக்கவும்")}
      </button>
    </div>
  );
}
