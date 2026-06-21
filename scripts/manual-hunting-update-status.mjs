import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";

const allowedStatuses = new Set([
  "new",
  "ready_to_send",
  "contacted",
  "replied",
  "qualified",
  "sent_to_jakub",
  "not_fit",
  "do_not_contact",
]);

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
  const positional = [];
  const options = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [rawKey, ...rawValue] = arg.slice(2).split("=");
      options[rawKey] = rawValue.length ? rawValue.join("=") : "true";
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
};

const printUsageAndExit = () => {
  console.error(`Usage:
  npm run leads:manual-status -- HUNT-001 contacted --follow-up=2026-06-22 --notes="sent via Bazos"
  npm run leads:manual-status -- HUNT-001 replied --notes="asked for audit"
  npm run leads:manual-status -- HUNT-001 qualified --jakub-notified=yes --crm-lead-id=...
  npm run leads:manual-status -- HUNT-001 contacted --dry-run

Allowed statuses:
  ${[...allowedStatuses].join(", ")}
`);
  process.exit(1);
};

const today = () => new Date().toISOString().slice(0, 10);

const defaultMessageVersion = (candidateId) => {
  const number = Number(candidateId.replace("HUNT-", ""));
  if (number >= 1 && number <= 3) return `${candidateId}-first-message`;
  if ((number >= 4 && number <= 9) || number === 11) return `${candidateId}-next-seven`;
  return `${candidateId}-reserve-ten`;
};

const buildLogRowFromCandidate = (candidate, status, options) => ({
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
  outreach_channel: candidate.source === "Bazoš" ? "platform" : "platform",
  outreach_message_version: candidate.recommended_message_version?.startsWith("HUNT-")
    ? candidate.recommended_message_version
    : defaultMessageVersion(candidate.candidate_id),
  status,
  next_follow_up_at: options["follow-up"] || "",
  jakub_notified: options["jakub-notified"] || "no",
  crm_lead_id: options["crm-lead-id"] || "",
  notes: options.notes || candidate.notes || "",
});

const { positional, options } = parseArgs(process.argv.slice(2));
const [candidateId, status] = positional;

if (!candidateId || !status || !allowedStatuses.has(status)) {
  printUsageAndExit();
}

const { records: candidates } = readTable(candidatesPath);
const { headers: logHeaders, records: logRows } = readTable(logPath);
const candidate = candidates.find((row) => row.candidate_id === candidateId);

if (!candidate) {
  console.error(`Unknown candidate_id: ${candidateId}`);
  process.exit(1);
}

const existingIndex = logRows.findIndex((row) => row.source_url === candidate.source_url);
const existing = existingIndex >= 0 ? logRows[existingIndex] : buildLogRowFromCandidate(candidate, status, options);
const previousStatus = existingIndex >= 0 ? existing.status || "" : "";

existing.date = options.date || existing.date || today();
existing.status = status;
existing.next_follow_up_at = options["follow-up"] ?? existing.next_follow_up_at ?? "";
existing.jakub_notified = options["jakub-notified"] ?? existing.jakub_notified ?? "no";
existing.crm_lead_id = options["crm-lead-id"] ?? existing.crm_lead_id ?? "";

if (options.notes) {
  existing.notes = existing.notes ? `${existing.notes} | ${options.notes}` : options.notes;
}

if (existingIndex >= 0) {
  logRows[existingIndex] = existing;
} else {
  logRows.push(existing);
}

const outputRows = [
  logHeaders,
  ...logRows.map((row) => logHeaders.map((header) => row[header] || "")),
];

if (options["dry-run"] !== "true") {
  writeFileSync(logPath, stringifyCsv(outputRows));
}

console.log(
  JSON.stringify(
    {
      candidate_id: candidateId,
      dry_run: options["dry-run"] === "true",
      action: existingIndex >= 0 ? "update" : "append",
      previous_status: previousStatus,
      status,
      next_follow_up_at: existing.next_follow_up_at,
      jakub_notified: existing.jakub_notified,
      crm_lead_id: existing.crm_lead_id,
      log_path: logPath,
    },
    null,
    2,
  ),
);
