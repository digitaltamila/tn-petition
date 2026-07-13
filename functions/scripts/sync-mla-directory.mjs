import { load } from "cheerio";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourceUrl = "https://assembly.tn.gov.in/17thassembly/members.php";
const geographyUrl =
  "https://en.wikipedia.org/wiki/List_of_constituencies_of_the_Tamil_Nadu_Legislative_Assembly";
const dryRun = process.argv.includes("--dry-run");
const downloadPhotos = process.argv.includes("--download-photos");
const exportArg = process.argv.find((argument) =>
  argument.startsWith("--export="),
);

const clean = (value) => value.replace(/\s+/g, " ").trim();
const key = (value) =>
  value
    .replace(/\((?:S\.?\s*C\.?|S\.?\s*T\.?)\)/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "TN-Petition-Directory-Sync/2.0" },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function constituencyDistricts(html) {
  const $ = load(html);
  const table = $("table")
    .filter((_, element) =>
      /District/i.test($(element).find("tr").first().text()),
    )
    .first();
  const records = [];
  let currentDistrict = "";
  table.find("tr").each((_, row) => {
    const cells = $(row).find(":scope > th, :scope > td");
    const number = clean(cells.eq(0).text());
    const constituency = clean(cells.eq(1).text().replace(/\|/g, ""));
    const districtLink = $(row)
      .find('a[href*="_district"], a[title="Tiruvallur"]')
      .first();
    const district = clean(districtLink.text());
    if (district) currentDistrict = district;
    if (/^\d+$/.test(number) && constituency) {
      records.push({ constituency, district: currentDistrict });
    }
  });
  // Two rows are merged in the current source table markup and need explicit recovery.
  records.push(
    { constituency: "Srivilliputhur", district: "Virudhunagar" },
    { constituency: "Vasudevanallur", district: "Tenkasi" },
  );
  const aliases = {
    palacodu: "palacode",
    nilakkottai: "nilakottai",
    manapparai: "manapaarai",
    viluppuram: "villupuram",
    vriddhachalam: "virudhachalam",
    shozhinganallur: "sholinganallur",
    gudiyattam: "gudiyatham",
    colachel: "colachal",
    sangagiri: "sankari",
  };
  const result = new Map(
    records.map((record) => [key(record.constituency), record.district]),
  );
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (result.has(canonical)) result.set(alias, result.get(canonical));
  }
  return result;
}

function parseMembers(html, districts) {
  const $ = load(html);
  const members = [];
  $("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 6) return;
    const email = clean(cells.eq(4).text())
      .match(/[a-z0-9._%+-]+@tn\.gov\.in/i)?.[0]
      ?.toLowerCase();
    if (!email) return;
    const nameCell = clean(cells.eq(1).text());
    const groups = [...nameCell.matchAll(/\(((?:[^()]|\([^()]*\))*)\)/g)].map(
      (match) => match[1].trim(),
    );
    let constituency = groups
      .filter(
        (group) =>
          !/^(DMK|INC|AIADMK|BJP|PMK|VCK|CPI|CPM|TVK|MDMK|IUML|Minister)/i.test(
            group,
          ),
      )
      .at(-1);
    if (email === "mlatirupattur@tn.gov.in") constituency = "Tirupattur";
    const name = clean(
      nameCell
        .replace(/\(((?:[^()]|\([^()]*\))*)\)/g, " ")
        .replace(/\b(?:Hon\.\s*)?(?:Thiru|Tmt|Selvi)\.?(?=\s|$)/gi, " ")
        .replace(/\s+([.,])/g, "$1"),
    );
    const imageSource = cells.eq(5).find("img").attr("src");
    if (!name || !constituency || !imageSource) return;
    const photoFile = `${email.split("@")[0].replace(/^mla/, "")}.jpg`;
    members.push({
      name,
      constituency,
      district:
        email === "mlatirupattur@tn.gov.in"
          ? "Tirupathur"
          : districts.get(key(constituency)) || "",
      email,
      photoUrl: `/mla-photos/${photoFile}`,
      officialPhotoUrl: new URL(imageSource, sourceUrl).href,
      photoFile,
    });
  });
  return [...new Map(members.map((member) => [member.email, member])).values()];
}

const [assemblyHtml, geographyHtml] = await Promise.all([
  fetchHtml(sourceUrl),
  fetchHtml(geographyUrl),
]);
const members = parseMembers(
  assemblyHtml,
  constituencyDistricts(geographyHtml),
);
if (members.length < 220) {
  throw new Error(
    `Parser found only ${members.length} members; the official page structure may have changed.`,
  );
}
const missingDistricts = members.filter((member) => !member.district);
if (missingDistricts.length) {
  throw new Error(
    `No district mapping for: ${missingDistricts.map((member) => member.constituency).join(", ")}`,
  );
}

console.log(
  `Parsed ${members.length} verified 17th Assembly records from ${sourceUrl}`,
);
if (exportArg) {
  const output = resolve(exportArg.slice("--export=".length));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    `${JSON.stringify(
      {
        assembly: "17th",
        sourceUrl,
        geographyUrl,
        verifiedAt: new Date().toISOString().slice(0, 10),
        members,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Exported ${output}`);
  if (downloadPhotos) {
    const photoDirectory = resolve(dirname(output), "..", "mla-photos");
    await mkdir(photoDirectory, { recursive: true });
    for (let index = 0; index < members.length; index += 12) {
      await Promise.all(
        members.slice(index, index + 12).map(async (member) => {
          const photo = await fetch(member.officialPhotoUrl);
          if (
            !photo.ok ||
            !photo.headers.get("content-type")?.startsWith("image/")
          ) {
            throw new Error(`Photo download failed for ${member.name}`);
          }
          await writeFile(
            resolve(photoDirectory, member.photoFile),
            Buffer.from(await photo.arrayBuffer()),
          );
        }),
      );
    }
    console.log(
      `Downloaded ${members.length} official photos to ${photoDirectory}`,
    );
  }
}
if (dryRun) {
  console.log(members.slice(0, 5));
  process.exit(0);
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();
for (let index = 0; index < members.length; index += 400) {
  const batch = db.batch();
  for (const member of members.slice(index, index + 400)) {
    const id = `mla_${member.email.split("@")[0].replace(/^mla/, "")}`;
    batch.set(
      db.doc(`governmentRecipients/${id}`),
      {
        departmentName: `Member of Legislative Assembly — ${member.constituency}`,
        mlaName: member.name,
        constituency: member.constituency,
        district: member.district,
        email: member.email,
        photoUrl: member.photoUrl,
        officialPhotoUrl: member.officialPhotoUrl,
        recipientType: "mla",
        delivery: "to",
        active: true,
        verificationStatus: "verified",
        lastVerifiedDate: new Date().toISOString().slice(0, 10),
        sourceUrl,
        sourceAssembly: "17th",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}
console.log("Firestore 17th Assembly MLA directory updated.");
