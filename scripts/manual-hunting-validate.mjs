import { readFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const firstMessagePaths = [
  "ops/leads/manual-owner-hunting-first-batch-2026-06-19.md",
  "ops/leads/manual-owner-hunting-next-seven-2026-06-19.md",
  "ops/leads/manual-owner-hunting-reserve-ten-2026-06-19.md",
  "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md",
];
const replyAuditPath = "ops/leads/manual-owner-hunting-reply-audits-2026-06-19.md";
const expansionMessagePath = "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md";

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

const readTable = (path) => {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const readMessageIds = (paths, blockIndex = 0) => {
  const ids = new Set();

  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    const sections = text.split(/\n##\s+/).slice(1);

    for (const section of sections) {
      const id = section.match(/\bHUNT-\d{3}\b/)?.[0];
      const blocks = [...section.matchAll(/```text\n([\s\S]*?)\n```/g)];
      const message = blocks[blockIndex]?.[1]?.trim();
      if (id && message) ids.add(id);
    }
  }

  return ids;
};

const includesReservationSignal = (row) =>
  [
    row.listing_title,
    row.reason_for_grade,
    row.first_observation,
    row.second_observation,
    row.third_observation,
    row.notes,
  ]
    .join(" ")
    .toLowerCase()
    .includes("rezerv");

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const candidatesByUrl = new Map(candidates.map((row) => [row.source_url, row]));
const firstMessageIds = readMessageIds(firstMessagePaths);
const replyAuditIds = new Set([
  ...readMessageIds([replyAuditPath]),
  ...readMessageIds([expansionMessagePath], 1),
]);

const errors = [];
const warnings = [];

if (candidates.length < 20) {
  errors.push(`Expected at least 20 reviewed candidates, found ${candidates.length}.`);
}

for (const row of logRows) {
  if (!allowedStatuses.has(row.status)) {
    errors.push(`Unknown status "${row.status}" for ${row.listing_title}.`);
  }

  if (!candidatesByUrl.has(row.source_url)) {
    errors.push(`Log row has no matching candidate URL: ${row.source_url}`);
  }
}

const readyRows = logRows.filter((row) => row.status === "ready_to_send");
const notFitRows = logRows.filter((row) => row.status === "not_fit");
const contactedRows = logRows.filter((row) =>
  ["contacted", "replied", "qualified", "sent_to_jakub"].includes(row.status),
);

if (readyRows.length !== 10) {
  errors.push(`Expected exactly 10 ready_to_send rows, found ${readyRows.length}.`);
}

for (const row of readyRows) {
  const candidate = candidatesByUrl.get(row.source_url);
  const id = candidate?.candidate_id || "UNKNOWN";

  if (!candidate) continue;

  if (!firstMessageIds.has(id)) {
    errors.push(`${id} is ready_to_send but has no first-message draft.`);
  }

  if (!replyAuditIds.has(id)) {
    errors.push(`${id} is ready_to_send but has no reply-audit draft.`);
  }

  if (includesReservationSignal(row)) {
    errors.push(`${id} is ready_to_send but row text contains a reservation signal.`);
  }

  if (row.source_url.includes("bezrealitky.cz")) {
    warnings.push(`${id} ready URL uses Czech Bezrealitky mirror; prefer SK detail before sending.`);
  }
}

for (const row of notFitRows) {
  const candidate = candidatesByUrl.get(row.source_url);
  if (candidate?.candidate_id && !row.notes) {
    warnings.push(`${candidate.candidate_id} is not_fit without notes.`);
  }
}

const queue = readyRows.map((row) => {
  const candidate = candidatesByUrl.get(row.source_url);
  return {
    candidate_id: candidate?.candidate_id || "UNKNOWN",
    source: row.source,
    location: row.location,
    asking_price: row.asking_price,
    source_url: row.source_url,
  };
});

const result = {
  ok: errors.length === 0,
  candidates_reviewed: candidates.length,
  log_rows: logRows.length,
  ready_to_send: readyRows.length,
  not_fit: notFitRows.length,
  contacted: contactedRows.length,
  first_message_drafts: firstMessageIds.size,
  reply_audit_drafts: replyAuditIds.size,
  queue,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length) {
  process.exit(1);
}
