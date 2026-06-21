import { existsSync, readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const reportOutputPath = "ops/leads/manual-owner-hunting-session-report-apply-2026-06-19.md";

const statusMap = {
  sent: "contacted",
  contacted: "contacted",
  blocked: "not_fit",
  stop: "not_fit",
  not_fit: "not_fit",
  open: "",
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

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const cleanNote = (value) =>
  String(value || "")
    .replace(/\b09\d{2}[\s./-]?\d{3}[\s./-]?\d{3}\b/g, "[phone-redacted]")
    .replace(/\b\+421[\s./-]?\d{3}[\s./-]?\d{3}[\s./-]?\d{3}\b/g, "[phone-redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email-redacted]")
    .replace(/\s+/g, " ")
    .trim();

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
  outreach_channel: "platform",
  outreach_message_version: candidate.recommended_message_version?.startsWith("HUNT-")
    ? candidate.recommended_message_version
    : defaultMessageVersion(candidate.candidate_id),
  status,
  next_follow_up_at: options["follow-up"] || "",
  jakub_notified: "no",
  crm_lead_id: "",
  notes: "",
});

const parseReport = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const candidateId = parts[0] || "";
      const rawSessionStatus = (parts[1] || "").toLowerCase();
      const note = cleanNote(parts.slice(2).join(" | "));
      const status = statusMap[rawSessionStatus];

      return {
        line,
        candidate_id: candidateId,
        session_status: rawSessionStatus,
        status,
        note,
      };
    });

const options = parseArgs(process.argv.slice(2));
const apply = options.apply === "true";
const writeReport = options["no-report"] !== "true";
const reportPath = options.report || "";
const reportText = options.text || "";

if (!reportPath && !reportText) {
  console.error(`Usage:
  npm run leads:manual-apply-session-report -- --report=/tmp/send-session-report.txt
  npm run leads:manual-apply-session-report -- --report=/tmp/send-session-report.txt --apply

Report line format copied from send-session HTML:
  HUNT-001 | sent | optional local note
  HUNT-002 | blocked | optional reason
  HUNT-003 | open |

Dry-run is default. Open rows are ignored.
`);
  process.exit(1);
}

if (reportPath && !existsSync(reportPath)) {
  console.error(`Missing report file: ${reportPath}`);
  process.exit(1);
}

const rawReport = reportPath ? readFileSync(reportPath, "utf8") : reportText;
const parsedRows = parseReport(rawReport);
const { records: candidates } = readTable(candidatesPath);
const { headers: logHeaders, records: logRows } = readTable(logPath);
const candidatesById = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
const logIndexByUrl = new Map(logRows.map((row, index) => [row.source_url, index]));

const errors = [];
const warnings = [];
const changes = [];

for (const row of parsedRows) {
  if (!/^HUNT-\d{3}$/.test(row.candidate_id)) {
    errors.push(`Invalid candidate id in line: ${row.line}`);
    continue;
  }

  if (row.status === undefined) {
    errors.push(`Invalid session status for ${row.candidate_id}: ${row.session_status}`);
    continue;
  }

  if (!row.status) {
    warnings.push(`${row.candidate_id} left open; no status update planned.`);
    continue;
  }

  const candidate = candidatesById.get(row.candidate_id);
  if (!candidate) {
    errors.push(`Unknown candidate id: ${row.candidate_id}`);
    continue;
  }

  const existingIndex = logIndexByUrl.get(candidate.source_url);
  const existing = existingIndex === undefined
    ? buildLogRowFromCandidate(candidate, row.status, options)
    : { ...logRows[existingIndex] };
  const previousStatus = existing.status || "";

  if (previousStatus && !["ready_to_send", "new", row.status].includes(previousStatus)) {
    warnings.push(`${row.candidate_id} currently has status ${previousStatus}; planned update still recorded.`);
  }

  existing.date = options.date || existing.date || today();
  existing.status = row.status;
  existing.next_follow_up_at =
    row.status === "contacted" ? options["follow-up"] || existing.next_follow_up_at || "2026-06-24" : "";
  existing.jakub_notified = existing.jakub_notified || "no";
  const noteSuffix = row.status === "contacted" ? "session report: sent manually" : "session report: stopped before send";
  const note = [noteSuffix, row.note].filter(Boolean).join("; ");
  existing.notes = existing.notes ? `${existing.notes} | ${note}` : note;

  changes.push({
    candidate_id: row.candidate_id,
    action: existingIndex === undefined ? "append" : "update",
    previous_status: previousStatus,
    status: row.status,
    next_follow_up_at: existing.next_follow_up_at,
    note: row.note,
    existing_index: existingIndex,
    row: existing,
  });
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const nextLogRows = [...logRows];
for (const change of changes) {
  if (change.existing_index === undefined) {
    nextLogRows.push(change.row);
  } else {
    nextLogRows[change.existing_index] = change.row;
  }
}

if (apply) {
  writeFileSync(
    logPath,
    stringifyCsv([logHeaders, ...nextLogRows.map((row) => logHeaders.map((header) => row[header] || ""))]),
  );
}

const markdown = `# Manual owner hunting session report apply

Date: ${today()}

Dry run: ${apply ? "no" : "yes"}

## Planned changes

${changes.length ? changes.map((change) => `- ${change.candidate_id}: ${change.previous_status || "missing"} -> ${change.status}`).join("\n") : "- none"}

## Warnings

${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- none"}

## Source

${reportPath ? `Report file: ${reportPath}` : "Report text passed through --text"}
`;

if (writeReport) {
  writeFileSync(reportOutputPath, markdown);
}

console.log(
  JSON.stringify(
    {
      dry_run: !apply,
      parsed_rows: parsedRows.length,
      planned_changes: changes.length,
      warnings,
      report_markdown: writeReport ? reportOutputPath : "",
      apply_command: reportPath
        ? `npm run leads:manual-apply-session-report -- --report=${reportPath} --apply`
        : "pass --apply with the same --text payload",
    },
    null,
    2,
  ),
);
