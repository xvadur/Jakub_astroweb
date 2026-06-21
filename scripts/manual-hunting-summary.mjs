import { readFileSync } from "node:fs";

const candidatesPath = process.argv[2] || "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = process.argv[3] || "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const messageDraftPaths = process.argv.slice(4);
const defaultMessageDraftPaths = [
  "ops/leads/manual-owner-hunting-first-batch-2026-06-19.md",
  "ops/leads/manual-owner-hunting-next-seven-2026-06-19.md",
  "ops/leads/manual-owner-hunting-reserve-ten-2026-06-19.md",
];
const replyAuditPath = "ops/leads/manual-owner-hunting-reply-audits-2026-06-19.md";

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

const readCandidateIdsFromDrafts = (paths) => {
  const ids = new Set();

  for (const path of paths) {
    let text = "";
    try {
      text = readFileSync(path, "utf8");
    } catch {
      continue;
    }

    for (const match of text.matchAll(/\bHUNT-\d{3}\b/g)) {
      ids.add(match[0]);
    }
  }

  return ids;
};

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter((row) => row.source_url && row.status && row.status !== "new|ready_to_send|contacted|replied|qualified|sent_to_jakub|not_fit|do_not_contact");
const candidateIds = new Set(candidates.map((row) => row.candidate_id));
const draftIds = readCandidateIdsFromDrafts(messageDraftPaths.length ? messageDraftPaths : defaultMessageDraftPaths);
const replyAuditIds = readCandidateIdsFromDrafts([replyAuditPath]);
const coveredDraftIds = [...draftIds].filter((id) => candidateIds.has(id));
const coveredReplyAuditIds = [...replyAuditIds].filter((id) => candidateIds.has(id));

const countBy = (rows, key) =>
  rows.reduce((counts, row) => {
    const value = row[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

const isAB = (row) => row.ai_grade === "A" || row.ai_grade === "B";
const qualifiedStatuses = new Set(["qualified", "sent_to_jakub"]);
const contactedStatuses = new Set(["contacted", "replied", "qualified", "sent_to_jakub"]);

const contacted = logRows.filter((row) => contactedStatuses.has(row.status));
const qualified = logRows.filter((row) => qualifiedStatuses.has(row.status) && isAB(row));
const ready = logRows.filter((row) => row.status === "ready_to_send");

const summary = {
  candidates_reviewed: candidates.length,
  log_rows: logRows.length,
  ready_to_send: ready.length,
  contacted: contacted.length,
  replied: logRows.filter((row) => row.status === "replied").length,
  qualified_ab_leads: qualified.length,
  sent_to_jakub: logRows.filter((row) => row.status === "sent_to_jakub").length,
  not_fit: logRows.filter((row) => row.status === "not_fit").length,
  do_not_contact: logRows.filter((row) => row.status === "do_not_contact").length,
  remaining_to_20_ab_leads: Math.max(0, 20 - qualified.length),
  candidates_with_message_draft: coveredDraftIds.length,
  candidates_without_message_draft: Math.max(0, candidates.length - coveredDraftIds.length),
  candidates_with_reply_audit: coveredReplyAuditIds.length,
  candidates_without_reply_audit: Math.max(0, candidates.length - coveredReplyAuditIds.length),
  candidate_grades: countBy(candidates, "ai_grade"),
  log_statuses: countBy(logRows, "status"),
};

console.log(JSON.stringify(summary, null, 2));
