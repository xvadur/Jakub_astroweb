import { existsSync, readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const reportOutputPath = "ops/leads/manual-owner-hunting-reply-report-apply-2026-06-19.md";

const statusMap = {
  audit: "replied",
  replied: "replied",
  qualified: "qualified",
  call: "qualified",
  valuation: "qualified",
  handoff: "sent_to_jakub",
  sent_to_jakub: "sent_to_jakub",
  declined: "do_not_contact",
  no: "do_not_contact",
  stop: "do_not_contact",
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

const parseReport = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const candidateId = parts[0] || "";
      const replyStatus = (parts[1] || "").toLowerCase();
      const note = cleanNote(parts.slice(2).join(" | "));

      return {
        line,
        candidate_id: candidateId,
        reply_status: replyStatus,
        status: statusMap[replyStatus],
        note,
      };
    });

const appendNote = (existing, suffix) => {
  if (!suffix) return existing || "";
  return existing ? `${existing} | ${suffix}` : suffix;
};

const options = parseArgs(process.argv.slice(2));
const apply = options.apply === "true";
const writeReport = options["no-report"] !== "true";
const reportPath = options.report || "";
const reportText = options.text || "";

if (!reportPath && !reportText) {
  console.error(`Usage:
  npm run leads:manual-apply-reply-report -- --report=/tmp/reply-report.txt
  npm run leads:manual-apply-reply-report -- --report=/tmp/reply-report.txt --apply

Report line format:
  HUNT-001 | audit | owner asked for the 3 observations
  HUNT-002 | qualified | owner gave permission for Jakub to contact them
  HUNT-003 | sent_to_jakub | handoff actually sent to Jakub
  HUNT-004 | declined | owner declined / stop

Mapping:
  audit/replied -> replied
  qualified/call/valuation -> qualified
  handoff/sent_to_jakub -> sent_to_jakub
  declined/no/stop -> do_not_contact

Dry-run is default.
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

  if (!row.status) {
    errors.push(`Invalid reply status for ${row.candidate_id}: ${row.reply_status}`);
    continue;
  }

  const candidate = candidatesById.get(row.candidate_id);
  if (!candidate) {
    errors.push(`Unknown candidate id: ${row.candidate_id}`);
    continue;
  }

  const existingIndex = logIndexByUrl.get(candidate.source_url);
  if (existingIndex === undefined) {
    errors.push(`${row.candidate_id} is not in the lead log. Import/contact it before reply intake.`);
    continue;
  }

  const existing = { ...logRows[existingIndex] };
  const previousStatus = existing.status || "";

  if (row.status === "replied" && !["contacted", "replied", "qualified", "sent_to_jakub"].includes(previousStatus)) {
    warnings.push(`${row.candidate_id} reply is recorded from status ${previousStatus}; check if outreach was logged.`);
  }

  if (row.status === "qualified" && !["replied", "qualified", "sent_to_jakub"].includes(previousStatus)) {
    warnings.push(`${row.candidate_id} qualified from status ${previousStatus}; acceptable only if owner gave direct call/valuation permission.`);
  }

  if (row.status === "sent_to_jakub" && !["qualified", "sent_to_jakub"].includes(previousStatus)) {
    warnings.push(`${row.candidate_id} handoff from status ${previousStatus}; make sure Jakub actually received the qualified lead.`);
  }

  existing.date = options.date || existing.date || today();
  existing.status = row.status;
  existing.jakub_notified =
    row.status === "qualified" || row.status === "sent_to_jakub"
      ? options["jakub-notified"] || existing.jakub_notified || "yes"
      : existing.jakub_notified || "no";
  existing.next_follow_up_at =
    row.status === "do_not_contact" || row.status === "sent_to_jakub"
      ? ""
      : options["follow-up"] || existing.next_follow_up_at || "";

  const statusNote = {
    replied: "reply report: owner accepted audit / meaningful engagement",
    qualified: "reply report: owner gave call, valuation, or continuation permission",
    sent_to_jakub: "reply report: qualified owner lead handed to Jakub",
    do_not_contact: "reply report: owner declined or requested stop",
  }[row.status];

  existing.notes = appendNote(existing.notes, [statusNote, row.note].filter(Boolean).join("; "));

  changes.push({
    candidate_id: row.candidate_id,
    previous_status: previousStatus,
    status: row.status,
    jakub_notified: existing.jakub_notified,
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
  nextLogRows[change.existing_index] = change.row;
}

if (apply) {
  writeFileSync(
    logPath,
    stringifyCsv([logHeaders, ...nextLogRows.map((row) => logHeaders.map((header) => row[header] || ""))]),
  );
}

const markdown = `# Manual owner hunting reply report apply

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
        ? `npm run leads:manual-apply-reply-report -- --report=${reportPath} --apply`
        : "pass --apply with the same --text payload",
    },
    null,
    2,
  ),
);
