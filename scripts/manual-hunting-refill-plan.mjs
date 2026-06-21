import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const expansionCandidatesPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const reservePath = "ops/leads/manual-owner-hunting-reserve-verification-2026-06-19.csv";
const markdownOutputPath = "ops/leads/manual-owner-hunting-refill-plan-2026-06-19.md";
const jsonOutputPath = "ops/leads/manual-owner-hunting-refill-plan-2026-06-19.json";

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

const parseArgs = (args) => {
  const options = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rawValue] = arg.slice(2).split("=");
    options[rawKey] = rawValue.length ? rawValue.join("=") : "true";
  }

  return options;
};

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const gradeRank = { A: 0, B: 1, C: 2 };

const options = parseArgs(process.argv.slice(2));
const targetReady = Number(options.target || 10);
const simulateReady = options["simulate-ready"] === undefined ? null : Number(options["simulate-ready"]);

if (!Number.isInteger(targetReady) || targetReady < 1) {
  console.error("--target must be a positive integer.");
  process.exit(1);
}

if (simulateReady !== null && (!Number.isInteger(simulateReady) || simulateReady < 0)) {
  console.error("--simulate-ready must be a non-negative integer.");
  process.exit(1);
}

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const expansionCandidates = readTable(expansionCandidatesPath).filter((row) => row.candidate_id);
const reserveRows = readTable(reservePath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);

const candidatesById = new Map(candidates.map((row) => [row.candidate_id, row]));
const loggedUrls = new Set(logRows.map((row) => row.source_url));
const mainIds = new Set(candidates.map((row) => row.candidate_id));
const realReady = logRows.filter((row) => row.status === "ready_to_send").length;
const effectiveReady = simulateReady ?? realReady;
const openSlots = Math.max(0, targetReady - effectiveReady);

const reserveCandidates = reserveRows
  .map((row) => candidatesById.get(row.candidate_id))
  .filter((candidate) => candidate && !loggedUrls.has(candidate.source_url))
  .map((candidate) => ({
    candidate_id: candidate.candidate_id,
    source: candidate.source,
    source_url: candidate.source_url,
    listing_title: candidate.listing_title,
    location: candidate.location,
    asking_price: candidate.asking_price,
    ai_grade: candidate.ai_grade,
    stage: "verified_reserve",
    action: "promote_reserve",
    command: `npm run leads:manual-status -- ${candidate.candidate_id} ready_to_send --follow-up=2026-06-24 --notes="live detail verified manually; ready for outreach"`,
  }));

const reservePlan = reserveCandidates.slice(0, openSlots);
const remainingAfterReserve = Math.max(0, openSlots - reservePlan.length);

const expansionPlan = expansionCandidates
  .filter((candidate) => candidate.ai_grade === "A" || candidate.ai_grade === "B")
  .filter((candidate) => !mainIds.has(candidate.candidate_id) && !loggedUrls.has(candidate.source_url))
  .sort(
    (a, b) =>
      (gradeRank[a.ai_grade] ?? 9) - (gradeRank[b.ai_grade] ?? 9) ||
      a.candidate_id.localeCompare(b.candidate_id),
  )
  .slice(0, remainingAfterReserve)
  .map((candidate) => ({
    candidate_id: candidate.candidate_id,
    source: candidate.source,
    source_url: candidate.source_url,
    listing_title: candidate.listing_title,
    location: candidate.location,
    asking_price: candidate.asking_price,
    ai_grade: candidate.ai_grade,
    stage: "expansion",
    action: "import_expansion_after_live_check",
    command: `npm run leads:manual-import-expansion -- ${candidate.candidate_id} ready_to_send --follow-up=2026-06-24 --notes="live checked from expansion; ready for outreach"`,
  }));

const planned = [...reservePlan, ...expansionPlan];
const commands = planned.map((row) => row.command);
const afterCommands = [
  "npm run leads:manual-validate",
  "npm run leads:manual-live-preflight",
  "npm run leads:manual-export",
  "npm run leads:manual-send-session",
  "npm run leads:manual-followups",
  "npm run leads:manual-handoff",
  "npm run leads:manual-source-review",
  "npm run leads:manual-cockpit",
  "npm run leads:manual-summary",
];

const result = {
  date: today,
  target_ready_to_send: targetReady,
  real_ready_to_send: realReady,
  simulated_ready_to_send: simulateReady,
  effective_ready_to_send: effectiveReady,
  open_slots: openSlots,
  verified_reserve_available: reserveCandidates.length,
  reserve_planned: reservePlan.length,
  expansion_planned: expansionPlan.length,
  planned_count: planned.length,
  planned,
  commands,
  after_commands: afterCommands,
  markdown: markdownOutputPath,
  json: jsonOutputPath,
};

const commandBlock = [...commands, ...afterCommands].join("\n");
const rowsMarkdown = planned.length
  ? planned
      .map(
        (row, index) => `## ${index + 1}. ${row.candidate_id} - ${row.location}

- Stage: ${row.stage}
- Action: ${row.action}
- Source: ${row.source}
- Grade: ${row.ai_grade}
- Price: ${row.asking_price}
- Listing: ${row.source_url}

\`\`\`bash
${row.command}
\`\`\`
`,
      )
      .join("\n")
  : "No refill needed for the requested target.";

const markdown = `# Manual owner hunting refill plan

Date: ${today}

Purpose: refill the ready-to-send queue after a send block without manually deciding which reserve or expansion candidates come next.

## Summary

\`\`\`json
${JSON.stringify(
  {
    target_ready_to_send: result.target_ready_to_send,
    real_ready_to_send: result.real_ready_to_send,
    simulated_ready_to_send: result.simulated_ready_to_send,
    open_slots: result.open_slots,
    reserve_planned: result.reserve_planned,
    expansion_planned: result.expansion_planned,
    planned_count: result.planned_count,
  },
  null,
  2,
)}
\`\`\`

## Plan

${rowsMarkdown}

## Run All

Run these sequentially, not in parallel:

\`\`\`bash
${commandBlock}
\`\`\`

## Usage

After the first 10 messages are marked \`contacted\`:

\`\`\`bash
npm run leads:manual-refill -- --target=10
\`\`\`

To preview the next 10 even before changing current statuses:

\`\`\`bash
npm run leads:manual-refill -- --target=10 --simulate-ready=0
\`\`\`
`;

writeFileSync(jsonOutputPath, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(markdownOutputPath, markdown);

console.log(JSON.stringify(result, null, 2));
