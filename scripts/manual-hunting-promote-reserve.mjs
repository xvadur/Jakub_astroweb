import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";

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

const readTable = (path) => {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0];
  const records = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );

  return { headers, records };
};

const parseArgs = (args) => {
  const options = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rawValue] = arg.slice(2).split("=");
    options[rawKey] = rawValue.length ? rawValue.join("=") : "true";
  }

  return options;
};

const today = () => new Date().toISOString().slice(0, 10);

const defaultMessageVersion = (candidateId) => {
  const number = Number(candidateId.replace("HUNT-", ""));
  if (number >= 1 && number <= 3) return `${candidateId}-first-message`;
  if ((number >= 4 && number <= 9) || number === 11) return `${candidateId}-next-seven`;
  return `${candidateId}-reserve-ten`;
};

const buildLogRowFromCandidate = (candidate, options) => ({
  date: options.date || today(),
  source: candidate.source,
  source_url: candidate.source_url,
  listing_title: candidate.listing_title,
  suspected_owner_type: candidate.suspected_owner_type,
  property_type: candidate.property_type,
  location: candidate.location,
  asking_price: candidate.asking_price,
  public_contact: candidate.public_contact_path,
  signal: candidate.signal,
  ai_grade: candidate.ai_grade,
  reason_for_grade: candidate.reason_for_grade,
  first_observation: candidate.first_observation,
  second_observation: candidate.second_observation,
  third_observation: candidate.third_observation,
  outreach_channel: "platform",
  outreach_message_version: candidate.recommended_message_version?.startsWith("HUNT-")
    ? candidate.recommended_message_version
    : defaultMessageVersion(candidate.candidate_id),
  status: "ready_to_send",
  next_follow_up_at: options["follow-up"] || "2026-06-24",
  jakub_notified: "no",
  crm_lead_id: "",
  notes: candidate.notes
    ? `${candidate.notes} | promoted from verified reserve`
    : "promoted from verified reserve",
});

const options = parseArgs(process.argv.slice(2));
const targetReady = Number(options.target || 10);
const limit = Number(options.limit || targetReady);
const dryRun = options["dry-run"] === "true";

if (!Number.isInteger(targetReady) || targetReady < 1) {
  console.error("--target must be a positive integer.");
  process.exit(1);
}

if (!Number.isInteger(limit) || limit < 1) {
  console.error("--limit must be a positive integer.");
  process.exit(1);
}

const { records: candidates } = readTable(candidatesPath);
const { headers: logHeaders, records: logRows } = readTable(logPath);
const realLogRows = logRows.filter((row) => row.source_url && row.status && !row.status.includes("|"));
const readyCount = realLogRows.filter((row) => row.status === "ready_to_send").length;
const slots = Math.max(0, Math.min(targetReady - readyCount, limit));
const loggedUrls = new Set(realLogRows.map((row) => row.source_url));
const loggedIds = new Set(
  realLogRows
    .map((row) => candidates.find((candidate) => candidate.source_url === row.source_url)?.candidate_id)
    .filter(Boolean),
);

const reserveCandidates = candidates.filter((candidate) => {
  const notes = (candidate.notes || "").toLowerCase();
  if (!candidate.candidate_id || !candidate.source_url) return false;
  if (loggedUrls.has(candidate.source_url) || loggedIds.has(candidate.candidate_id)) return false;
  return notes.includes("reserve live verified") && !notes.includes("do not contact");
});

const promote = reserveCandidates.slice(0, slots);
const nextRows = [...logRows, ...promote.map((candidate) => buildLogRowFromCandidate(candidate, options))];
const outputRows = [logHeaders, ...nextRows.map((row) => logHeaders.map((header) => row[header] || ""))];

if (!dryRun && promote.length) {
  writeFileSync(logPath, stringifyCsv(outputRows));
}

console.log(
  JSON.stringify(
    {
      dry_run: dryRun,
      target_ready_to_send: targetReady,
      current_ready_to_send: readyCount,
      open_slots: slots,
      verified_reserve_available: reserveCandidates.length,
      promoted_count: promote.length,
      promoted: promote.map((candidate) => ({
        candidate_id: candidate.candidate_id,
        source: candidate.source,
        location: candidate.location,
        asking_price: candidate.asking_price,
        source_url: candidate.source_url,
      })),
      log_path: logPath,
    },
    null,
    2,
  ),
);
