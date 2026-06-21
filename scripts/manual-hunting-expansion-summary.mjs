import { readFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const messagesPath = "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md";

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

const countBy = (rows, key) =>
  rows.reduce((counts, row) => {
    const value = row[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const messages = readFileSync(messagesPath, "utf8");
const messageIds = new Set([...messages.matchAll(/\bHUNT-\d{3}\b/g)].map((match) => match[0]));
const candidateIds = new Set(candidates.map((row) => row.candidate_id));
const missingMessageDrafts = candidates
  .filter((row) => !messageIds.has(row.candidate_id))
  .map((row) => row.candidate_id);
const extraMessageDrafts = [...messageIds].filter((id) => !candidateIds.has(id));
const abCandidates = candidates.filter((row) => row.ai_grade === "A" || row.ai_grade === "B");

console.log(
  JSON.stringify(
    {
      candidates_reviewed: candidates.length,
      ab_candidates: abCandidates.length,
      candidate_grades: countBy(candidates, "ai_grade"),
      sources: countBy(candidates, "source"),
      property_types: countBy(candidates, "property_type"),
      message_drafts_present_for_candidates: candidates.length - missingMessageDrafts.length,
      missing_message_drafts: missingMessageDrafts,
      extra_message_drafts: extraMessageDrafts,
      output_ready: candidates.length >= 40 && missingMessageDrafts.length === 0,
    },
    null,
    2,
  ),
);
