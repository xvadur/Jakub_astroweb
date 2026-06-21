import { existsSync, readFileSync } from "node:fs";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const parseArgs = (argv) =>
  argv.reduce((acc, arg) => {
    if (!arg.startsWith("--")) return acc;
    const [key, ...valueParts] = arg.slice(2).split("=");
    acc[key] = valueParts.length ? valueParts.join("=") : "true";
    return acc;
  }, {});

const sanitizeLabel = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const args = parseArgs(process.argv.slice(2));
const label = sanitizeLabel(args.label || "deep");
const outputLabel = label ? `-${label}` : "";

const paths = {
  packJson: `ops/leads/manual-owner-hunting-source-import-pack${outputLabel}-${today}.json`,
  packCsv: `ops/leads/manual-owner-hunting-source-import-pack${outputLabel}-${today}.csv`,
  messagesMarkdown: `ops/leads/manual-owner-hunting-source-import-messages${outputLabel}-${today}.md`,
  mainCandidates: "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv",
  expansionCandidates: "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv",
  log: "ops/leads/manual-owner-hunting-log-2026-06-19.csv",
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((item) => item.some((value) => value.trim()));
};

const readTable = (path) => {
  if (!existsSync(path)) return [];
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0] || [];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const hasPrivateContact = (value) => {
  const text = String(value || "");
  return (
    /\b09\d{2}[\s./-]?\d{3}[\s./-]?\d{3}\b/.test(text) ||
    /\b\+421[\s./-]?\d{3}[\s./-]?\d{3}[\s./-]?\d{3}\b/.test(text) ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
  );
};

const errors = [];
const warnings = [];

if (!existsSync(paths.packJson)) errors.push(`Missing pack JSON: ${paths.packJson}`);
if (!existsSync(paths.packCsv)) errors.push(`Missing pack CSV: ${paths.packCsv}`);
if (!existsSync(paths.messagesMarkdown)) errors.push(`Missing messages markdown: ${paths.messagesMarkdown}`);

const pack = existsSync(paths.packJson)
  ? JSON.parse(readFileSync(paths.packJson, "utf8"))
  : { summary: {}, rows: [] };
const rows = pack.rows || [];
const packCsvText = existsSync(paths.packCsv) ? readFileSync(paths.packCsv, "utf8") : "";
const messagesText = existsSync(paths.messagesMarkdown) ? readFileSync(paths.messagesMarkdown, "utf8") : "";
const packCsvRows = existsSync(paths.packCsv) ? readTable(paths.packCsv) : [];
const mainRows = readTable(paths.mainCandidates);
const expansionRows = readTable(paths.expansionCandidates);
const logRows = readTable(paths.log);
const nonExpansionRows = [...mainRows, ...logRows];

const expansionById = new Map(expansionRows.map((row) => [row.candidate_id, row]));
const expansionByUrl = new Map(expansionRows.map((row) => [row.source_url, row]));
const nonExpansionIds = new Set(nonExpansionRows.map((row) => row.candidate_id).filter(Boolean));
const nonExpansionUrls = new Set(nonExpansionRows.map((row) => row.source_url).filter(Boolean));
const packIds = new Set();
const packUrls = new Set();
let alreadyAppended = 0;

if (rows.length !== packCsvRows.length) {
  errors.push(`Pack JSON rows (${rows.length}) do not match CSV rows (${packCsvRows.length}).`);
}

for (const row of rows) {
  if (!/^HUNT-\d{3,}$/.test(row.candidate_id || "")) {
    errors.push(`Invalid candidate_id: ${row.candidate_id || "missing"}`);
  }

  if (packIds.has(row.candidate_id)) errors.push(`Duplicate candidate_id in pack: ${row.candidate_id}`);
  packIds.add(row.candidate_id);

  if (!row.source_url) errors.push(`Missing source_url for ${row.candidate_id}`);
  if (packUrls.has(row.source_url)) errors.push(`Duplicate source_url in pack: ${row.source_url}`);
  packUrls.add(row.source_url);

  const expansionBySameId = expansionById.get(row.candidate_id);
  const expansionBySameUrl = expansionByUrl.get(row.source_url);
  const existsAsSameExpansionRow =
    expansionBySameId?.source_url === row.source_url &&
    expansionBySameUrl?.candidate_id === row.candidate_id;

  if (existsAsSameExpansionRow) {
    alreadyAppended += 1;
  } else {
    if (expansionBySameId) errors.push(`candidate_id exists in expansion with different URL: ${row.candidate_id}`);
    if (expansionBySameUrl) errors.push(`source_url exists in expansion with different candidate_id: ${row.source_url}`);
  }

  if (nonExpansionIds.has(row.candidate_id)) errors.push(`candidate_id already exists in active pipeline: ${row.candidate_id}`);
  if (nonExpansionUrls.has(row.source_url)) errors.push(`source_url already exists in active pipeline: ${row.source_url}`);

  if (!["A", "B"].includes(row.ai_grade)) warnings.push(`${row.candidate_id} has non A/B grade: ${row.ai_grade}`);
  if (row.status !== "reviewed_not_contacted") errors.push(`${row.candidate_id} status must be reviewed_not_contacted.`);
  if (hasPrivateContact(Object.values(row).join(" "))) errors.push(`${row.candidate_id} contains private contact-like data.`);
}

if (hasPrivateContact(packCsvText)) errors.push("Pack CSV contains private contact-like data.");
if (hasPrivateContact(messagesText)) errors.push("Messages markdown contains private contact-like data.");

const messageIds = [...messagesText.matchAll(/^##\s+(HUNT-\d{3,})/gm)].map((match) => match[1]);
const missingMessages = rows
  .map((row) => row.candidate_id)
  .filter((candidateId) => !messageIds.includes(candidateId));
if (missingMessages.length) {
  errors.push(`Missing message sections: ${missingMessages.join(", ")}`);
}

const result = {
  ok: errors.length === 0,
  label,
  rows: rows.length,
  pack_csv_rows: packCsvRows.length,
  message_sections: messageIds.length,
  already_appended: alreadyAppended,
  paths,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
