import { readFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const messagesPath = "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md";
const mainCandidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
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

const readTable = (path) => {
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

const messageSections = (text) =>
  text
    .split(/\n##\s+/)
    .slice(1)
    .map((section) => {
      const id = section.match(/\bHUNT-\d{3,}\b/)?.[0] || "";
      const textBlocks = [...section.matchAll(/```text\n([\s\S]*?)\n```/g)].map((match) =>
        match[1].trim(),
      );
      const auditReplyCount = [...section.matchAll(/\nAudit reply:\n/g)].length;

      return {
        id,
        section,
        text_blocks: textBlocks,
        audit_reply_count: auditReplyCount,
      };
    });

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const mainCandidates = readTable(mainCandidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const messagesText = readFileSync(messagesPath, "utf8");
const sections = messageSections(messagesText);
const sectionById = new Map(sections.map((section) => [section.id, section]));
const candidateIds = new Set(candidates.map((row) => row.candidate_id));
const mainIds = new Set(mainCandidates.map((row) => row.candidate_id));
const logUrls = new Set(logRows.map((row) => row.source_url));
const errors = [];
const warnings = [];

for (const row of candidates) {
  if (!/^HUNT-\d{3,}$/.test(row.candidate_id)) {
    errors.push(`Invalid candidate_id: ${row.candidate_id}`);
  }

  if (mainIds.has(row.candidate_id)) {
    errors.push(`${row.candidate_id} exists in both expansion and main candidates.`);
  }

  if (logUrls.has(row.source_url)) {
    errors.push(`${row.candidate_id} expansion URL is already in active log: ${row.source_url}`);
  }

  if (!["A", "B", "C"].includes(row.ai_grade)) {
    errors.push(`${row.candidate_id} has invalid ai_grade: ${row.ai_grade}`);
  }

  if (row.status !== "reviewed_not_contacted") {
    errors.push(`${row.candidate_id} expansion status must be reviewed_not_contacted.`);
  }

  if (hasPrivateContact(Object.values(row).join(" "))) {
    errors.push(`${row.candidate_id} contains private contact-like data in candidate row.`);
  }

  const section = sectionById.get(row.candidate_id);
  if (!section) {
    errors.push(`${row.candidate_id} has no message section.`);
    continue;
  }

  if (section.text_blocks.length !== 2) {
    errors.push(`${row.candidate_id} must have exactly 2 text blocks, found ${section.text_blocks.length}.`);
  }

  if (section.audit_reply_count !== 1) {
    errors.push(`${row.candidate_id} must have exactly 1 Audit reply label, found ${section.audit_reply_count}.`);
  }

  if (hasPrivateContact(section.section)) {
    errors.push(`${row.candidate_id} message section contains private contact-like data.`);
  }

  if ((section.text_blocks[0] || "").length < 80) {
    warnings.push(`${row.candidate_id} first message is unusually short.`);
  }

  if ((section.text_blocks[1] || "").length < 80) {
    warnings.push(`${row.candidate_id} audit reply is unusually short.`);
  }
}

const duplicateCandidateIds = candidates
  .map((row) => row.candidate_id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
for (const id of new Set(duplicateCandidateIds)) {
  errors.push(`Duplicate candidate_id in expansion CSV: ${id}`);
}

const duplicateUrls = candidates
  .map((row) => row.source_url)
  .filter((url, index, urls) => url && urls.indexOf(url) !== index);
for (const url of new Set(duplicateUrls)) {
  errors.push(`Duplicate source_url in expansion CSV: ${url}`);
}

const extraMessageSections = sections
  .map((section) => section.id)
  .filter((id) => id && !candidateIds.has(id));
if (extraMessageSections.length) {
  errors.push(`Message sections without expansion candidate: ${extraMessageSections.join(", ")}`);
}

const malformedMessageSections = sections.filter((section) => !section.id).length;
if (malformedMessageSections) {
  errors.push(`Found ${malformedMessageSections} message sections without HUNT id.`);
}

const abCandidates = candidates.filter((row) => row.ai_grade === "A" || row.ai_grade === "B");
const result = {
  ok: errors.length === 0,
  expansion_candidates: candidates.length,
  ab_candidates: abCandidates.length,
  message_sections: sections.length,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
