import { load } from "cheerio";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
const sourceUrl = "https://assembly.tn.gov.in/16thassembly/members.php",
  dryRun = process.argv.includes("--dry-run");
const response = await fetch(sourceUrl, {
  headers: { "user-agent": "TN-Petition-Directory-Sync/1.0" },
});
if (!response.ok)
  throw new Error(`Assembly directory returned ${response.status}`);
const $ = load(await response.text()),
  members = [];
$("tr").each((_, row) => {
  const cells = $(row)
    .find("td")
    .map((_, cell) => $(cell).text().replace(/\s+/g, " ").trim())
    .get();
  if (cells.length < 3) return;
  const joined = cells.join(" "),
    email = joined.match(/[a-z0-9._%+-]+@tn\.gov\.in/i)?.[0]?.toLowerCase();
  if (!email) return;
  const nameCell = cells[1] || cells[0],
    outer = /\(((?:[^()]|\([^()]*\))*)\)/g,
    groups = [...nameCell.matchAll(outer)].map((x) => x[1].trim()),
    ignored = /^(DMK|INC|AIADMK|BJP|PMK|VCK|CPI|Hon\.|Minister)/i,
    constituency = groups.filter((x) => !ignored.test(x)).at(-1),
    name = nameCell.replace(outer, " ").replace(/\s+/g, " ").trim();
  if (!name || !constituency) return;
  members.push({ name, constituency, email });
});
const unique = [...new Map(members.map((x) => [x.email, x])).values()];
if (unique.length < 200)
  throw new Error(
    `Parser found only ${unique.length} members; official page structure may have changed.`,
  );
console.log(`Parsed ${unique.length} verified MLA records from ${sourceUrl}`);
if (dryRun) {
  console.log(unique.slice(0, 5));
  process.exit(0);
}
initializeApp({ credential: applicationDefault() });
const db = getFirestore(),
  batchSize = 400;
for (let i = 0; i < unique.length; i += batchSize) {
  const batch = db.batch();
  for (const m of unique.slice(i, i + batchSize)) {
    const id = `mla_${m.email.split("@")[0].replace(/^mla/, "")}`;
    batch.set(
      db.doc(`governmentRecipients/${id}`),
      {
        departmentName: `Member of Legislative Assembly — ${m.constituency}`,
        mlaName: m.name,
        constituency: m.constituency,
        email: m.email,
        recipientType: "mla",
        delivery: "to",
        active: true,
        verificationStatus: "verified",
        lastVerifiedDate: new Date().toISOString().slice(0, 10),
        sourceUrl,
        sourceAssembly: "16th",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}
console.log(
  "Firestore MLA directory updated. Review vacancies and rerun after Assembly changes.",
);
