import type { Lang } from "./types";

const common = {
  ta: {
    title: "காவலர் தேர்வர்களின் பொதுமனு",
    tag: "தேர்வு முடிவுகள், 2026 அறிவிப்புகள் மற்றும் வயது தளர்வுக்கான தனிப்பட்ட கோரிக்கை",
    start: "மனுவைத் தொடங்கவும்",
    independent:
      "இது தமிழ்நாடு அரசின் அதிகாரப்பூர்வ இணையதளம் அல்ல. தேர்வர்கள் தங்கள் கோரிக்கையை சம்பந்தப்பட்ட அரசு அதிகாரிகளுக்கு அனுப்ப உதவும் சுயாதீன தளம்.",
    own: "உங்கள் இறுதி ஒப்புதலுக்குப் பிறகு மட்டுமே, உங்கள் சொந்த Gmail கணக்கிலிருந்து மின்னஞ்சல் அனுப்பப்படும்.",
    details: "உங்கள் விவரங்கள்",
    signature: "கையொப்பம்",
    consent: "ஒப்புதல்",
    preview: "மனு முன்னோட்டம்",
    recipients: "பெறுநர்கள்",
    email: "மின்னஞ்சல் ஆய்வு",
    back: "முந்தைய படி",
    continue: "தொடரவும்",
    send: "மனுவை அனுப்பவும்",
  },
  en: {
    title: "Police Aspirants’ Public Petition",
    tag: "A personal representation for pending results, 2026 notifications and age relaxation",
    start: "Start your petition",
    independent:
      "This independent platform helps aspirants send their representation to relevant authorities. It is not an official Tamil Nadu Government website.",
    own: "The email is sent from your own Gmail account only after your final review and approval.",
    details: "Your details",
    signature: "Signature",
    consent: "Your consent",
    preview: "Petition preview",
    recipients: "Recipients",
    email: "Email review",
    back: "Previous step",
    continue: "Continue",
    send: "Send petition",
  },
} as const;

export const landingCopy = {
  en: {
    eyebrow: "A responsible, individual representation",
    heroTitle: "Let your request reach the right authorities",
    heroText:
      "Prepare a personalised Tamil Nadu police recruitment petition, sign it, review it and send it securely from your own Gmail account.",
    requestsTitle: "What this petition requests",
    requests: [
      "Publish pending police recruitment results promptly",
      "Release the 2026 PC and SI recruitment notifications",
      "Provide fair age relaxation for aspirants affected by delays",
    ],
    processTitle: "Simple, transparent and under your control",
    processText:
      "Nothing is sent automatically. You review every detail before the final action.",
    process: [
      [
        "1",
        "Enter details",
        "Add your contact, exam and constituency information.",
      ],
      [
        "2",
        "Sign & consent",
        "Draw your signature and approve this specific petition.",
      ],
      ["3", "Review", "Check the exact petition, recipients, PDF and email."],
      [
        "4",
        "Send yourself",
        "Sign in to Google and make the final send decision.",
      ],
    ],
    safetyTitle: "Your account stays in your control",
    safetyText:
      "We request only Gmail send permission. We never ask for your Gmail password, OTP, Aadhaar or banking details.",
    disclaimer:
      "Independent public initiative — not affiliated with the Tamil Nadu Government.",
  },
  ta: {
    eyebrow: "பொறுப்பான தனிப்பட்ட பொதுமனு",
    heroTitle: "உங்கள் கோரிக்கை உரிய அதிகாரிகளைச் சென்றடையட்டும்",
    heroText:
      "தமிழ்நாடு காவல்துறை ஆட்சேர்ப்பு தொடர்பான தனிப்பட்ட மனுவைத் தயாரித்து, கையொப்பமிட்டு, ஆய்வு செய்து உங்கள் சொந்த Gmail கணக்கிலிருந்து பாதுகாப்பாக அனுப்புங்கள்.",
    requestsTitle: "இந்த மனுவின் முக்கிய கோரிக்கைகள்",
    requests: [
      "நிலுவையில் உள்ள காவல்துறை ஆட்சேர்ப்புத் தேர்வு முடிவுகளை விரைந்து வெளியிடுதல்",
      "2026 PC மற்றும் SI ஆட்சேர்ப்பு அறிவிப்புகளை வெளியிடுதல்",
      "தாமதத்தால் பாதிக்கப்பட்ட தேர்வர்களுக்கு உரிய வயது தளர்வு வழங்குதல்",
    ],
    processTitle: "எளிமையான, வெளிப்படையான நடைமுறை",
    processText:
      "எதுவும் தானாக அனுப்பப்படாது. இறுதி நடவடிக்கைக்கு முன் ஒவ்வொரு விவரத்தையும் நீங்களே ஆய்வு செய்வீர்கள்.",
    process: [
      [
        "1",
        "விவரங்களை உள்ளிடுங்கள்",
        "தொடர்பு, தேர்வு மற்றும் தொகுதி விவரங்களைச் சேர்க்கவும்.",
      ],
      [
        "2",
        "கையொப்பம் மற்றும் ஒப்புதல்",
        "கையொப்பமிட்டு இந்த மனுவிற்கு மட்டும் ஒப்புதல் அளிக்கவும்.",
      ],
      [
        "3",
        "முழுமையாக ஆய்வு செய்யுங்கள்",
        "மனு, பெறுநர்கள், PDF மற்றும் மின்னஞ்சலைச் சரிபார்க்கவும்.",
      ],
      [
        "4",
        "நீங்களே அனுப்புங்கள்",
        "Google கணக்கில் உள்நுழைந்து இறுதி முடிவை எடுக்கவும்.",
      ],
    ],
    safetyTitle: "உங்கள் கணக்கு உங்கள் கட்டுப்பாட்டில்",
    safetyText:
      "Gmail மூலம் அனுப்பும் அனுமதி மட்டுமே கோரப்படும். Gmail கடவுச்சொல், OTP, Aadhaar அல்லது வங்கி விவரங்களை ஒருபோதும் கேட்கமாட்டோம்.",
    disclaimer: "சுயாதீன பொதுநல முயற்சி — தமிழ்நாடு அரசுடன் இணைக்கப்படவில்லை.",
  },
} as const;

export const t = <K extends keyof typeof common.en>(lang: Lang, key: K) =>
  common[lang][key];
export const localized = (lang: Lang, en: string, ta: string) =>
  lang === "ta" ? ta : en;
