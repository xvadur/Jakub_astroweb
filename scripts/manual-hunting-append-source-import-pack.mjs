import { existsSync, readFileSync, writeFileSync } from "node:fs";

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
const apply = args.apply === "true";

const paths = {
  packJson: `ops/leads/manual-owner-hunting-source-import-pack${outputLabel}-${today}.json`,
  messagesPack: `ops/leads/manual-owner-hunting-source-import-messages${outputLabel}-${today}.md`,
  expansionCandidates: "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv",
  expansionMessages: "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md",
  mainCandidates: "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv",
  log: "ops/leads/manual-owner-hunting-log-2026-06-19.csv",
  reportMarkdown: `ops/leads/manual-owner-hunting-source-append-report${outputLabel}-${today}.md`,
  reportJson: `ops/leads/manual-owner-hunting-source-append-report${outputLabel}-${today}.json`,
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

const stringifyCsv = (rows) =>
  `${rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell || "");
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\n")}\n`;

const readTableWithHeaders = (path) => {
  if (!existsSync(path)) return { headers: [], records: [] };
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0] || [];
  const records = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );

  return { headers, records };
};

const hasPrivateContact = (value) => {
  const text = String(value || "");
  return (
    /\b09\d{2}[\s./-]?\d{3}[\s./-]?\d{3}\b/.test(text) ||
    /\b\+421[\s./-]?\d{3}[\s./-]?\d{3}[\s./-]?\d{3}\b/.test(text) ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
  );
};

const readMessagesById = (text) => {
  const messages = new Map();

  for (const section of text.split(/\n##\s+/).slice(1)) {
    const id = section.match(/\bHUNT-\d{3,}\b/)?.[0];
    if (!id) continue;
    messages.set(id, `## ${section.trim()}`);
  }

  return messages;
};

const errors = [];

if (!existsSync(paths.packJson)) errors.push(`Missing pack JSON: ${paths.packJson}`);
if (!existsSync(paths.messagesPack)) errors.push(`Missing pack messages: ${paths.messagesPack}`);
if (!existsSync(paths.expansionCandidates)) errors.push(`Missing expansion candidates: ${paths.expansionCandidates}`);
if (!existsSync(paths.expansionMessages)) errors.push(`Missing expansion messages: ${paths.expansionMessages}`);

const pack = existsSync(paths.packJson)
  ? JSON.parse(readFileSync(paths.packJson, "utf8"))
  : { rows: [] };
const packRows = pack.rows || [];
const packMessagesText = existsSync(paths.messagesPack) ? readFileSync(paths.messagesPack, "utf8") : "";
const expansionMessagesText = existsSync(paths.expansionMessages)
  ? readFileSync(paths.expansionMessages, "utf8")
  : "";
const packMessagesById = readMessagesById(packMessagesText);

const { headers: expansionHeaders, records: expansionRows } = readTableWithHeaders(paths.expansionCandidates);
const { records: mainRows } = readTableWithHeaders(paths.mainCandidates);
const { records: logRows } = readTableWithHeaders(paths.log);
const existingRows = [...expansionRows, ...mainRows, ...logRows];
const existingIds = new Set(existingRows.map((row) => row.candidate_id).filter(Boolean));
const existingUrls = new Set(existingRows.map((row) => row.source_url).filter(Boolean));
const existingMessageIds = new Set([...expansionMessagesText.matchAll(/^##\s+(HUNT-\d{3,})/gm)].map((match) => match[1]));

if (!expansionHeaders.length) errors.push("Expansion CSV has no headers.");

for (const row of packRows) {
  if (!/^HUNT-\d{3,}$/.test(row.candidate_id || "")) errors.push(`Invalid candidate_id: ${row.candidate_id}`);
  if (!row.source_url) errors.push(`Missing source_url for ${row.candidate_id}`);
  if (existingIds.has(row.candidate_id)) errors.push(`candidate_id already exists: ${row.candidate_id}`);
  if (existingUrls.has(row.source_url)) errors.push(`source_url already exists: ${row.source_url}`);
  if (!["A", "B"].includes(row.ai_grade)) errors.push(`${row.candidate_id} is not A/B grade.`);
  if (row.status !== "reviewed_not_contacted") errors.push(`${row.candidate_id} must remain reviewed_not_contacted.`);
  if (!packMessagesById.has(row.candidate_id)) errors.push(`Missing message section for ${row.candidate_id}`);
  if (existingMessageIds.has(row.candidate_id)) errors.push(`Message section already exists for ${row.candidate_id}`);
  if (hasPrivateContact(Object.values(row).join(" "))) errors.push(`${row.candidate_id} contains private contact-like data.`);
}

if (hasPrivateContact(packMessagesText)) errors.push("Pack messages contain private contact-like data.");

const appendedCandidateRows = packRows.map((row) =>
  Object.fromEntries(expansionHeaders.map((header) => [header, row[header] || ""])),
);
const appendedMessages = packRows
  .map((row) => packMessagesById.get(row.candidate_id))
  .filter(Boolean)
  .join("\n\n");

const nextExpansionRows = [...expansionRows, ...appendedCandidateRows];
const result = {
  ok: errors.length === 0,
  dry_run: !apply,
  label,
  append_candidates: packRows.length,
  expansion_before: expansionRows.length,
  expansion_after: errors.length === 0 ? nextExpansionRows.length : expansionRows.length,
  append_ids: packRows.map((row) => row.candidate_id),
  paths,
  errors,
};

const markdown = `# Manual owner hunting source append report

Date: ${today}

Mode: ${apply ? "apply" : "dry-run"}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`

Rules:

- This appends source-import candidates to expansion backlog only.
- It does not write to the active log.
- It does not create \`ready_to_send\`, \`contacted\`, \`replied\`, \`qualified\`, or \`sent_to_jakub\` statuses.
- After append, regenerate next-wave reports before any import to active queue.
`;

if (result.ok && apply) {
  writeFileSync(
    paths.expansionCandidates,
    stringifyCsv([expansionHeaders, ...nextExpansionRows.map((row) => expansionHeaders.map((header) => row[header] || ""))]),
  );
  writeFileSync(
    paths.expansionMessages,
    `${expansionMessagesText.trimEnd()}\n\n${appendedMessages}\n`,
  );
}

writeFileSync(paths.reportJson, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(paths.reportMarkdown, markdown);

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
