import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import type { studentSchema } from "./schema.js";
type Student = z.infer<typeof studentSchema>;
export type PetitionKind = "government" | "mla";
const requests = `கோரிக்கைகள்:\n\n1. நிலுவையில் உள்ள காவல்துறை ஆட்சேர்ப்புத் தேர்வு முடிவுகளை விரைந்து வெளியிட வேண்டும்.\n\n2. 2026 ஆம் ஆண்டுக்கான இரண்டாம் நிலைக் காவலர் (PC) மற்றும் சார்பு ஆய்வாளர் (SI) ஆட்சேர்ப்பு அறிவிப்புகளை விரைவாக வெளியிட வேண்டும்.\n\n3. ஆட்சேர்ப்பு அறிவிப்புகள் மற்றும் தேர்வு நடைமுறைகளில் ஏற்பட்ட தாமதங்களால் வயது வரம்பைப் பாதிக்கப்பட்ட விண்ணப்பதாரர்களுக்கு உரிய வயது தளர்வு வழங்க வேண்டும்.`;
const governmentIntro = `மதிப்பிற்குரிய ஐயா/அம்மையீர்,\n\nதமிழ்நாடு காவல்துறை ஆட்சேர்ப்புத் தேர்வுகளுக்குத் தயாராகி வரும் விண்ணப்பதாரராக, கீழ்க்கண்ட கோரிக்கைகளைத் தங்களின் கனிவான பரிசீலனைக்காகச் சமர்ப்பிக்கிறேன்.`;
const governmentClose = `காவல்துறையில் பணியாற்ற வேண்டும் என்ற இலக்குடன் பல ஆண்டுகளாகப் பயிற்சி பெற்று வரும் தேர்வர்களின் கல்வி, வேலைவாய்ப்பு மற்றும் குடும்பச் சூழ்நிலைகளைக் கருத்தில் கொண்டு, மேற்கண்ட கோரிக்கைகளின் மீது உரிய விதிகள் மற்றும் நடைமுறைகளுக்குட்பட்டு விரைந்து நடவடிக்கை எடுக்குமாறு பணிவுடன் கேட்டுக்கொள்கிறேன். இந்த மனுவைத் தங்கள் துறையின் அதிகார வரம்பிற்குட்பட்ட வகையில் பரிசீலிக்கவோ அல்லது உரிய அதிகார அமைப்பிற்கு அனுப்பிவைக்கவோ கேட்டுக்கொள்கிறேன்.\n\nநன்றி.`;
const mlaIntro = `மதிப்பிற்குரிய சட்டமன்ற உறுப்பினர் அவர்களுக்கு வணக்கம்,\n\nதங்கள் தொகுதியில் வசிக்கும் காவல்துறை ஆட்சேர்ப்பு விண்ணப்பதாரராக, ஆட்சேர்ப்புத் தாமதங்களால் தேர்வர்கள் எதிர்கொள்ளும் சிரமங்களைத் தங்கள் கவனத்திற்குக் கொண்டுவருகிறேன். கீழ்க்கண்ட கோரிக்கைகளைத் தமிழ்நாடு அரசின் சம்பந்தப்பட்ட துறைகளிடம் எடுத்துரைத்து உரிய நடவடிக்கைக்காகக் குரல் கொடுக்குமாறு பணிவுடன் கேட்டுக்கொள்கிறேன்.`;
const mlaClose = `தேர்வுக்காகத் தொடர்ந்து தயாராகிவரும் இளைஞர்களின் வேலைவாய்ப்பு, வயது வரம்பு மற்றும் குடும்பச் சூழ்நிலைகளைக் கருத்தில் கொண்டு, மேற்கண்ட கோரிக்கைகளை அரசின் கவனத்திற்குக் கொண்டு சென்று சம்பந்தப்பட்ட துறைகளிடம் உரிய நடவடிக்கை கோருமாறு கேட்டுக்கொள்கிறேன்.\n\nநன்றி.`;
export async function makePdf(
  s: Student,
  signature: string,
  reference: string,
  generated: string,
  kind: PetitionKind,
  recipient: string,
) {
  const doc = new PDFDocument({
      size: "A4",
      margins: { top: 55, bottom: 55, left: 55, right: 55 },
      bufferPages: true,
      info: { Title: "Tamil Nadu Police Recruitment Petition", Author: s.name },
    }),
    chunks: Buffer[] = [];
  doc.on("data", (x) => chunks.push(x));
  const font = [
    path.resolve(process.cwd(), "assets/NotoSansTamil.ttf"),
    path.resolve(process.cwd(), "functions/assets/NotoSansTamil.ttf"),
  ].find(existsSync);
  if (!font) throw new Error("Tamil PDF font is unavailable.");
  doc.registerFont("Tamil", font).font("Tamil").fontSize(10);
  doc
    .fillColor("#102a43")
    .fontSize(15)
    .text("தமிழ்நாடு காவல்துறை ஆட்சேர்ப்பு தொடர்பான பொதுமனு", {
      align: "center",
    });
  doc
    .moveDown()
    .fillColor("#111827")
    .fontSize(10)
    .text(`இடம்: ${s.town}`, { align: "right" })
    .text(`தேதி: ${new Date(generated).toLocaleDateString("en-IN")}`, {
      align: "right",
    })
    .text(`மனு எண்: ${reference}`, { align: "right" });
  doc
    .moveDown()
    .text(
      `அனுப்புநர்:\n${s.name}\n${s.address}\n${s.town}, ${s.district} - ${s.pin}\nகைப்பேசி: ${s.mobile}\nமின்னஞ்சல்: ${s.email}`,
    );
  doc.moveDown().text(`பெறுநர்:\n${recipient}`);
  doc
    .moveDown()
    .text(
      "பொருள்: காவல்துறை ஆட்சேர்ப்பு முடிவுகள், 2026 PC/SI அறிவிப்புகள் மற்றும் வயது தளர்வு கோருதல்.",
      { underline: true },
    );
  doc.moveDown().text(kind === "mla" ? mlaIntro : governmentIntro, {
    align: "justify",
    lineGap: 3,
  });
  doc.moveDown().text(requests, { align: "justify", lineGap: 3 });
  doc.moveDown().text(kind === "mla" ? mlaClose : governmentClose, {
    align: "justify",
    lineGap: 3,
  });
  doc.moveDown().text("தங்கள் உண்மையுள்ள,");
  try {
    doc.image(Buffer.from(signature.split(",")[1], "base64"), {
      fit: [140, 55],
    });
  } catch {
    /* invalid image is rejected by schema/decoder */
  }
  doc.text(
    `${s.name}\nதேர்வு: ${s.exam} (${s.examYear})\nமாவட்டம்: ${s.district}${s.constituency ? `\nசட்டமன்றத் தொகுதி: ${s.constituency}` : ""}`,
  );
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    // PDFKit otherwise treats footer text inside the reserved margin as
    // overflow and appends a blank page for every buffered content page.
    doc.page.margins.bottom = 0;
    doc
      .fontSize(8)
      .fillColor("#52606d")
      .text(
        `${reference}  •  Page ${i + 1}  •  Generated ${generated}`,
        55,
        doc.page.height - 35,
        { width: 485, align: "center", lineBreak: false },
      );
    doc.page.margins.bottom = bottomMargin;
  }
  doc.end();
  await new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });
  return Buffer.concat(chunks);
}
