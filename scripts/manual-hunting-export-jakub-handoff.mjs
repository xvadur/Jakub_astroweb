import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const markdownOutputPath = "ops/leads/jakub-qualified-lead-handoff-2026-06-19.md";
const csvOutputPath = "ops/leads/jakub-qualified-lead-handoff-2026-06-19.csv";

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

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const candidatesByUrl = new Map(candidates.map((row) => [row.source_url, row]));
const handoffStatuses = new Set(["qualified", "sent_to_jakub"]);
const handoffRows = logRows
  .filter((row) => handoffStatuses.has(row.status))
  .map((row) => ({
    ...row,
    candidate: candidatesByUrl.get(row.source_url),
  }));

const errors = [];

for (const row of handoffRows) {
  if (!row.candidate) {
    errors.push(`No candidate row for qualified URL: ${row.source_url}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const buildHandoffText = (row) => {
  const candidateId = row.candidate.candidate_id;
  const contact = row.public_contact || row.candidate.public_contact_path || "platform thread / contact path not stored in repo";

  return `NOVÝ SELLER LEAD PRE JAKUBA

Kandidát: ${candidateId}
Status: ${row.status}
Zdroj: ${row.source}
Inzerát: ${row.source_url}
Nehnuteľnosť: ${row.property_type}, ${row.location}, ${row.asking_price}
Kontakt: ${contact}

Prečo je to relevantné:
- ${row.signal || row.candidate.signal}
- ${row.reason_for_grade || row.candidate.reason_for_grade}
- ${row.first_observation || row.candidate.first_observation}

Čo už bolo poslané:
- prvý personalizovaný outreach
- 3 auditové postrehy, ak vlastník prijal audit

Odporúčaný call angle:
- ${row.second_observation || row.candidate.second_observation}

Adam tracking:
- source: manual_owner_hunting
- candidate_id: ${candidateId}
- commission_source: Adam website/manual leadgen`;
};

const rowsMarkdown = handoffRows.length
  ? handoffRows
      .map((row, index) => {
        const candidateId = row.candidate.candidate_id;
        const sentToJakubCommand =
          row.status === "sent_to_jakub"
            ? "# already marked sent_to_jakub"
            : `npm run leads:manual-status -- ${candidateId} sent_to_jakub --jakub-notified=yes --notes="qualified owner lead handed to Jakub"`;

        return `## ${index + 1}. ${candidateId} - ${row.location}

\`\`\`text
${buildHandoffText(row)}
\`\`\`

\`\`\`bash
${sentToJakubCommand}
\`\`\`
`;
      })
      .join("\n")
  : `No qualified leads ready for Jakub handoff yet.

Do not create a handoff until the owner gives at least one of:

- phone number or preferred call time,
- explicit permission for Jakub to contact them,
- concrete request for valuation/audit/strategy,
- platform thread where Jakub can continue directly.`;

const markdown = `# Jakub qualified lead handoff

Date: ${today}

Purpose: live handoff export for owner leads that are already marked \`qualified\` or \`sent_to_jakub\`.

Current count: ${handoffRows.length}

${rowsMarkdown}
`;

const csvRows = [
  [
    "candidate_id",
    "status",
    "source",
    "source_url",
    "listing_title",
    "property_type",
    "location",
    "asking_price",
    "public_contact",
    "handoff_text",
    "sent_to_jakub_command",
  ],
  ...handoffRows.map((row) => {
    const candidateId = row.candidate.candidate_id;
    return [
      candidateId,
      row.status,
      row.source,
      row.source_url,
      row.listing_title,
      row.property_type,
      row.location,
      row.asking_price,
      row.public_contact,
      buildHandoffText(row),
      row.status === "sent_to_jakub"
        ? ""
        : `npm run leads:manual-status -- ${candidateId} sent_to_jakub --jakub-notified=yes --notes="qualified owner lead handed to Jakub"`,
    ];
  }),
];

writeFileSync(markdownOutputPath, markdown);
writeFileSync(csvOutputPath, stringifyCsv(csvRows));

console.log(
  JSON.stringify(
    {
      handoff_count: handoffRows.length,
      markdown: markdownOutputPath,
      csv: csvOutputPath,
    },
    null,
    2,
  ),
);
