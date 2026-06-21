import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const markdownOutputPath = "ops/leads/manual-owner-hunting-send-queue-2026-06-19.md";
const csvOutputPath = "ops/leads/manual-owner-hunting-send-queue-2026-06-19.csv";
const firstMessagePaths = [
  "ops/leads/manual-owner-hunting-first-batch-2026-06-19.md",
  "ops/leads/manual-owner-hunting-next-seven-2026-06-19.md",
  "ops/leads/manual-owner-hunting-reserve-ten-2026-06-19.md",
  "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md",
];
const replyAuditPath = "ops/leads/manual-owner-hunting-reply-audits-2026-06-19.md";
const expansionMessagePath = "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md";

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
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const readMessages = (paths, blockIndex = 0) => {
  const messages = new Map();

  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    const sections = text.split(/\n##\s+/).slice(1);

    for (const section of sections) {
      const id = section.match(/\bHUNT-\d{3}\b/)?.[0];
      const blocks = [...section.matchAll(/```text\n([\s\S]*?)\n```/g)];
      const message = blocks[blockIndex]?.[1]?.trim();
      if (id && message && !messages.has(id)) {
        messages.set(id, message);
      }
    }
  }

  return messages;
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
const firstMessages = readMessages(firstMessagePaths);
const replyAudits = new Map([
  ...readMessages([replyAuditPath]).entries(),
  ...readMessages([expansionMessagePath], 1).entries(),
]);
const readyRows = logRows.filter((row) => row.status === "ready_to_send");

const errors = [];

if (readyRows.length !== 10) {
  errors.push(`Expected exactly 10 ready_to_send rows, found ${readyRows.length}.`);
}

const queue = readyRows.map((row) => {
  const candidate = candidatesByUrl.get(row.source_url);
  const candidateId = candidate?.candidate_id || "";
  const firstMessage = firstMessages.get(candidateId) || "";
  const replyAudit = replyAudits.get(candidateId) || "";

  if (!candidate) errors.push(`No candidate row for ready URL: ${row.source_url}`);
  if (!firstMessage) errors.push(`${candidateId || row.source_url} has no first-message draft.`);
  if (!replyAudit) errors.push(`${candidateId || row.source_url} has no reply-audit draft.`);
  if (includesReservationSignal(row)) errors.push(`${candidateId} contains reservation signal.`);

  return {
    candidate_id: candidateId,
    source: row.source,
    source_url: row.source_url,
    listing_title: row.listing_title,
    location: row.location,
    property_type: row.property_type,
    asking_price: row.asking_price,
    ai_grade: row.ai_grade,
    public_contact: row.public_contact,
    first_message: firstMessage,
    reply_audit: replyAudit,
    contacted_command: `npm run leads:manual-status -- ${candidateId} contacted --follow-up=${row.next_follow_up_at || "2026-06-22"} --notes="sent manually via ${row.source}"`,
    replied_command: `npm run leads:manual-status -- ${candidateId} replied --notes="owner accepted audit; audit observations sent"`,
    qualified_command: `npm run leads:manual-status -- ${candidateId} qualified --jakub-notified=yes --notes="owner gave call permission"`,
  };
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const markdown = `# Manual owner hunting send queue

Date: 2026-06-19

Purpose: one-file send pack for the current validated 10-candidate manual outreach queue.

Before sending:

\`\`\`bash
npm run leads:manual-validate
\`\`\`

After each sent first message, run the candidate's \`contacted_command\`.

${queue
  .map(
    (row, index) => `## ${index + 1}. ${row.candidate_id} - ${row.location}

- Source: ${row.source}
- Listing: ${row.source_url}
- Title: ${row.listing_title}
- Property: ${row.property_type}
- Asking price: ${row.asking_price}
- Grade: ${row.ai_grade}
- Contact path: ${row.public_contact}

First message:

\`\`\`text
${row.first_message}
\`\`\`

If they accept the audit, send:

\`\`\`text
${row.reply_audit}
\`\`\`

Status commands:

\`\`\`bash
${row.contacted_command}
${row.replied_command}
${row.qualified_command}
\`\`\`
`,
  )
  .join("\n")}
`;

const csvRows = [
  [
    "order",
    "candidate_id",
    "source",
    "source_url",
    "listing_title",
    "location",
    "property_type",
    "asking_price",
    "ai_grade",
    "public_contact",
    "first_message",
    "reply_audit",
    "contacted_command",
    "replied_command",
    "qualified_command",
  ],
  ...queue.map((row, index) => [
    index + 1,
    row.candidate_id,
    row.source,
    row.source_url,
    row.listing_title,
    row.location,
    row.property_type,
    row.asking_price,
    row.ai_grade,
    row.public_contact,
    row.first_message,
    row.reply_audit,
    row.contacted_command,
    row.replied_command,
    row.qualified_command,
  ]),
];

writeFileSync(markdownOutputPath, markdown);
writeFileSync(csvOutputPath, stringifyCsv(csvRows));

console.log(
  JSON.stringify(
    {
      queue_count: queue.length,
      markdown: markdownOutputPath,
      csv: csvOutputPath,
    },
    null,
    2,
  ),
);
