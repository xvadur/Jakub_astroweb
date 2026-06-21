import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const markdownOutputPath = "ops/leads/manual-owner-hunting-reserve-verification-2026-06-19.md";
const csvOutputPath = "ops/leads/manual-owner-hunting-reserve-verification-2026-06-19.csv";

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

const candidateNeeds = (candidate) => {
  const url = candidate.source_url || "";

  if (url.includes("/vypis/") || url.endsWith("/sk/byty/bratislava")) {
    return {
      status: "needs_direct_detail_url",
      action:
        "Open the category/search result, find the exact listing detail, then update the candidate source_url before marking ready.",
    };
  }

  if (url.includes("bezrealitky.cz")) {
    return {
      status: "needs_sk_detail_url",
      action:
        "Open the listing and replace the Czech mirror with the matching bezrealitky.sk detail URL before marking ready.",
    };
  }

  if ((candidate.notes || "").toLowerCase().includes("reserve live verified")) {
    return {
      status: "verified_reserve_ready_for_promotion",
      action:
        "Detail URL and active/contact signals were verified. Promote to ready_to_send only after the active send queue has capacity.",
    };
  }

  if ((candidate.notes || "").toLowerCase().includes("do not contact")) {
    return {
      status: "verified_not_fit",
      action:
        "Do not promote. If it is not already logged, mark not_fit so it disappears from reserve work.",
    };
  }

  return {
    status: "needs_live_status_check",
    action:
      "Open the listing, confirm it is active/not reserved and that contact is still available before marking ready.",
  };
};

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const loggedUrls = new Set(logRows.map((row) => row.source_url));
const loggedIds = new Set(
  logRows
    .map((row) => candidates.find((candidate) => candidate.source_url === row.source_url)?.candidate_id)
    .filter(Boolean),
);

const reserve = candidates
  .filter((candidate) => !loggedUrls.has(candidate.source_url) && !loggedIds.has(candidate.candidate_id))
  .map((candidate) => {
    const need = candidateNeeds(candidate);
    const readyCommand = `npm run leads:manual-status -- ${candidate.candidate_id} ready_to_send --follow-up=2026-06-24 --notes="live detail verified manually; ready for outreach"`;
    const notFitCommand = `npm run leads:manual-status -- ${candidate.candidate_id} not_fit --notes="manual reserve verification failed: reserved, inactive, broker, duplicate, or no usable contact path"`;

    return {
      ...candidate,
      verification_status: need.status,
      verification_action: need.action,
      ready_command: readyCommand,
      not_fit_command: notFitCommand,
    };
  });

const markdown = `# Manual owner hunting reserve verification

Date: 2026-06-19

Purpose: turn reviewed reserve candidates into the next send queue. Do not mark a reserve candidate as \`ready_to_send\` until the listing is live, direct, not reserved and the contact path is usable.

Current reserve count: ${reserve.length}

## Verification Rules

- If URL is a category/search page, find the exact detail URL first.
- If URL uses \`bezrealitky.cz\`, replace it with the matching \`bezrealitky.sk\` detail URL first.
- If the listing is reserved, inactive, clearly brokered, duplicated, or contact is unavailable, mark \`not_fit\`.
- After changing any candidate URL manually, run \`npm run leads:manual-validate\` before sending.

${reserve
  .map(
    (row, index) => `## ${index + 1}. ${row.candidate_id} - ${row.location}

- Source: ${row.source}
- Listing: ${row.source_url}
- Title: ${row.listing_title}
- Asking price: ${row.asking_price}
- Grade: ${row.ai_grade}
- Verification status: ${row.verification_status}
- Action: ${row.verification_action}

Audit angle:

\`\`\`text
${row.first_observation}
${row.second_observation}
${row.third_observation}
\`\`\`

Commands after manual verification:

\`\`\`bash
${row.ready_command}
${row.not_fit_command}
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
    "asking_price",
    "ai_grade",
    "verification_status",
    "verification_action",
    "ready_command",
    "not_fit_command",
  ],
  ...reserve.map((row, index) => [
    index + 1,
    row.candidate_id,
    row.source,
    row.source_url,
    row.listing_title,
    row.location,
    row.asking_price,
    row.ai_grade,
    row.verification_status,
    row.verification_action,
    row.ready_command,
    row.not_fit_command,
  ]),
];

writeFileSync(markdownOutputPath, markdown);
writeFileSync(csvOutputPath, stringifyCsv(csvRows));

console.log(
  JSON.stringify(
    {
      reserve_count: reserve.length,
      markdown: markdownOutputPath,
      csv: csvOutputPath,
      needs: reserve.reduce((acc, row) => {
        acc[row.verification_status] = (acc[row.verification_status] || 0) + 1;
        return acc;
      }, {}),
    },
    null,
    2,
  ),
);
