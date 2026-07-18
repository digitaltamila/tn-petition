import { useParams } from "react-router-dom";
import type { Lang } from "../types";

const copy = {
  en: {
    privacy: [
      "Privacy policy",
      [
        "We collect only the applicant information needed to prepare the requested petition. If the applicant chooses Save and continue later, the form details and signature are protected by email-link sign-in and can be resumed for up to 30 days. Temporary PDFs are not retained after the petition is prepared.",
        "The applicant downloads the PDF, attaches it to the prepared email and sends it from their own email app.",
      ],
    ],
    terms: [
      "Terms of use",
      [
        "You must provide accurate information and submit only your own petition. Automated, bulk, threatening, defamatory or unrelated submissions are prohibited.",
        "Delivery or action by a government authority is not guaranteed.",
      ],
    ],
    disclaimer: [
      "Disclaimer",
      [
        "This independent public representation platform is an initiative of Muppadai Training Academy. It is not affiliated with, operated by or endorsed by the Tamil Nadu Government.",
      ],
    ],
    consent: [
      "Consent statement",
      [
        "Consent covers generating this petition with the supplied details and signature and sending this specific reviewed email after your final confirmation.",
      ],
    ],
    deletion: [
      "Data deletion request",
      [
        "Contact the configured privacy address with your petition reference and email address. Eligible records will be removed after identity verification.",
      ],
    ],
    contact: [
      "Contact",
      [
        "For support, privacy questions or data deletion requests, contact Muppadai Training Academy at info@muppadaitrainingacademy.com. Never send passwords, OTPs, Aadhaar or banking information.",
      ],
    ],
  },
  ta: {
    privacy: [
      "தனியுரிமைக் கொள்கை",
      [
        "கோரப்பட்ட மனுவைத் தயாரிக்கத் தேவையான தகவல்கள் மட்டுமே சேகரிக்கப்படும். கையொப்பம், முழு முகவரி மற்றும் தற்காலிக PDF மனு தயாரிக்கப்பட்ட பிறகு சேமிக்கப்படாது.",
        "விண்ணப்பதாரர் PDF-ஐ பதிவிறக்கி, தயாரான மின்னஞ்சலில் இணைத்து, தங்கள் மின்னஞ்சல் செயலியில் இருந்து அனுப்புவார்.",
      ],
    ],
    terms: [
      "பயன்பாட்டு விதிகள்",
      [
        "சரியான தகவல்களை வழங்கி உங்கள் சொந்த மனுவை மட்டுமே சமர்ப்பிக்க வேண்டும். தானியங்கி, மொத்த, அச்சுறுத்தும் அல்லது தொடர்பற்ற சமர்ப்பிப்புகள் தடைசெய்யப்பட்டுள்ளன.",
        "அரசு நடவடிக்கை எடுப்பது உறுதி செய்யப்படவில்லை.",
      ],
    ],
    disclaimer: [
      "பொறுப்புத்துறப்பு",
      [
        "இந்தச் சுயாதீன பொதுமனுத் தளம் முப்படை பயிற்சி அகாடமியின் முயற்சியாகும். இது தமிழ்நாடு அரசால் இயக்கப்படுவதோ அங்கீகரிக்கப்படுவதோ இல்லை.",
      ],
    ],
    consent: [
      "ஒப்புதல் அறிக்கை",
      [
        "வழங்கிய விவரங்கள் மற்றும் கையொப்பத்துடன் மனுவை உருவாக்கவும், இறுதி உறுதிப்படுத்தலுக்குப் பிறகு குறிப்பிட்ட மின்னஞ்சலை அனுப்பவும் மட்டுமே உங்கள் ஒப்புதல் பொருந்தும்.",
      ],
    ],
    deletion: [
      "தரவு நீக்கக் கோரிக்கை",
      [
        "மனு எண்ணையும் மின்னஞ்சல் முகவரியையும் குறிப்பிட்டு தனியுரிமை தொடர்பு முகவரியை அணுகவும். அடையாளச் சரிபார்ப்புக்குப் பிறகு தகுதியான பதிவுகள் நீக்கப்படும்.",
      ],
    ],
    contact: [
      "தொடர்பு",
      [
        "ஆதரவு, தனியுரிமைக் கேள்விகள் அல்லது தரவு நீக்கக் கோரிக்கைகளுக்கு info@muppadaitrainingacademy.com என்ற முகவரியில் முப்படை பயிற்சி அகாடமியைத் தொடர்புகொள்ளவும். கடவுச்சொல், OTP, Aadhaar அல்லது வங்கி விவரங்களை அனுப்ப வேண்டாம்.",
      ],
    ],
  },
} as const;

export function Legal({ lang }: { lang: Lang }) {
  const { page = "privacy" } = useParams();
  const section =
    (copy[lang] as Record<string, readonly [string, readonly string[]]>)[
      page
    ] || copy[lang].disclaimer;
  return (
    <article className="mx-auto my-8 max-w-3xl px-4 sm:my-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-10">
        <span className="text-sm font-bold uppercase tracking-wider text-green">
          Muppadai Training Academy
        </span>
        <h1 className="mt-3 text-2xl font-bold text-navy sm:text-3xl">
          {section[0]}
        </h1>
        <div className="mt-7 space-y-5 leading-8 text-slate-600">
          {section[1].map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-8 border-t pt-5 text-xs text-slate-400">
          Policy version 1.0 · Effective 12 July 2026
        </p>
      </div>
    </article>
  );
}
