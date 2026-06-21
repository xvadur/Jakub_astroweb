import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const expansionPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const nextWavePath = "ops/leads/manual-owner-hunting-next-wave-2026-06-19.json";
const scenariosPath = "ops/leads/leadgen-volume-scenarios-2026-06-19.csv";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const outputMarkdownPath = `ops/leadgen-backlog-runway-${today}.md`;
const outputJsonPath = `ops/leadgen-backlog-runway-${today}.json`;

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

const parsePercent = (value) => Number(String(value || "0").replace("%", "")) / 100;
const parseNumber = (value) => Number(String(value || "0").replace(",", "."));
const isAB = (row) => row.ai_grade === "A" || row.ai_grade === "B";
const round = (value, digits = 1) => Number(value.toFixed(digits));

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const expansion = readTable(expansionPath).filter((row) => row.candidate_id);
const scenarios = readTable(scenariosPath);
const nextWave = JSON.parse(readFileSync(nextWavePath, "utf8"));
const logRows = readTable(logPath).filter((row) => row.source_url && row.status && !row.status.includes("|"));

const logByUrl = new Map(logRows.map((row) => [row.source_url, row]));
const terminalStatuses = new Set(["contacted", "replied", "qualified", "sent_to_jakub", "not_fit", "do_not_contact"]);
const activeStatuses = new Set(["ready_to_send"]);
const nextWaveBlockedIds = new Set(
  nextWave.rows.filter((row) => row.decision !== "import_ready").map((row) => row.candidate_id),
);
const nextWaveImportReadyIds = new Set(
  nextWave.rows.filter((row) => row.decision === "import_ready").map((row) => row.candidate_id),
);

const mainAB = candidates.filter(isAB);
const expansionAB = expansion.filter(isAB);
const mainAvailable = mainAB.filter((row) => {
  const log = logByUrl.get(row.source_url);
  return !log || activeStatuses.has(log.status);
});
const mainDeadOrSpent = mainAB.filter((row) => {
  const log = logByUrl.get(row.source_url);
  return log && terminalStatuses.has(log.status);
});
const expansionAvailable = expansionAB.filter((row) => !nextWaveBlockedIds.has(row.candidate_id));
const expansionBlocked = expansionAB.filter((row) => nextWaveBlockedIds.has(row.candidate_id));
const readyToSend = logRows.filter((row) => row.status === "ready_to_send").length;
const contactedOrBeyond = logRows.filter((row) =>
  ["contacted", "replied", "qualified", "sent_to_jakub"].includes(row.status),
).length;
const qualifiedOrSent = logRows.filter((row) => ["qualified", "sent_to_jakub"].includes(row.status)).length;
const usableReviewedProspects = mainAvailable.length + expansionAvailable.length;
const immediateVerifiedCapacity = readyToSend + nextWaveImportReadyIds.size;
const targetDailySends = 20;

const scenarioRunway = scenarios.map((row) => {
  const sendsNeeded = parseNumber(row.sends_needed_for_20_qualified);
  const sendsPerDay = parseNumber(row.sends_per_day);
  const alreadyContacted = contactedOrBeyond;
  const remainingSendsNeeded = Math.max(0, sendsNeeded - alreadyContacted);
  const sourcingDeficit = Math.max(0, remainingSendsNeeded - usableReviewedProspects);
  const totalRunwayDays = usableReviewedProspects / sendsPerDay;
  const immediateRunwayDays = immediateVerifiedCapacity / sendsPerDay;

  return {
    scenario: row.scenario,
    overall_qualified_rate: row.overall_qualified_rate,
    sends_per_day: sendsPerDay,
    sends_needed_for_20_qualified: sendsNeeded,
    already_contacted: alreadyContacted,
    remaining_sends_needed: remainingSendsNeeded,
    usable_reviewed_prospects: usableReviewedProspects,
    sourcing_deficit: sourcingDeficit,
    immediate_verified_capacity: immediateVerifiedCapacity,
    immediate_runway_days: round(immediateRunwayDays, 2),
    total_reviewed_runway_days: round(totalRunwayDays, 2),
    review_batches_needed_at_40: Math.ceil(sourcingDeficit / 40),
  };
});

const base = scenarioRunway.find((row) => row.scenario === "base") || scenarioRunway[0];
const actions = [];

if (readyToSend > 0) {
  actions.push(`Send the current ${readyToSend} ready_to_send queue before sourcing work becomes the bottleneck.`);
}

if (base?.sourcing_deficit > 0) {
  actions.push(
    `Base scenario still needs about ${base.sourcing_deficit} more reviewed sendable prospects after current backlog; plan ${base.review_batches_needed_at_40} more 40-candidate review batches.`,
  );
}

if (usableReviewedProspects < 100) {
  actions.push("Raise reviewed owner backlog above 100 so daily sending does not stop after the first few days.");
}

const result = {
  date: today,
  current: {
    main_candidates: candidates.length,
    main_ab: mainAB.length,
    main_available: mainAvailable.length,
    main_dead_or_spent: mainDeadOrSpent.length,
    expansion_candidates: expansion.length,
    expansion_ab: expansionAB.length,
    expansion_available: expansionAvailable.length,
    expansion_blocked_ab: expansionBlocked.length,
    ready_to_send: readyToSend,
    contacted_or_beyond: contactedOrBeyond,
    qualified_or_sent: qualifiedOrSent,
    next_wave_import_ready: nextWaveImportReadyIds.size,
    immediate_verified_capacity: immediateVerifiedCapacity,
    usable_reviewed_prospects: usableReviewedProspects,
  },
  scenario_runway: scenarioRunway,
  actions,
  outputs: {
    markdown: outputMarkdownPath,
    json: outputJsonPath,
  },
};

const markdown = `# Leadgen backlog runway

Date: ${today}

Purpose: show whether the owner-prospect backlog is large enough to support the 20 qualified lead target.

## Current Backlog

\`\`\`json
${JSON.stringify(result.current, null, 2)}
\`\`\`

## Scenario Runway

| Scenario | Sends needed | Sends/day | Usable reviewed prospects | Immediate verified capacity | Immediate runway days | Total reviewed runway days | Sourcing deficit | 40-candidate batches needed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${scenarioRunway
  .map(
    (row) =>
      `| ${row.scenario} | ${row.sends_needed_for_20_qualified} | ${row.sends_per_day} | ${row.usable_reviewed_prospects} | ${row.immediate_verified_capacity} | ${row.immediate_runway_days} | ${row.total_reviewed_runway_days} | ${row.sourcing_deficit} | ${row.review_batches_needed_at_40} |`,
  )
  .join("\n")}

## Actions

${actions.map((action) => `- ${action}`).join("\n")}

## Interpretation

The first 20-touch day is prepared, but the base model requires a much larger owner-prospect machine. Current reviewed usable backlog is enough for roughly ${base?.total_reviewed_runway_days ?? "n/a"} working days at ${base?.sends_per_day ?? 20} sends/day. This means the next scalable workstream is not more copy; it is repeated sourcing/review batches while the first messages are being sent.
`;

writeFileSync(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);

console.log(
  JSON.stringify(
    {
      current: result.current,
      base_runway: base,
      actions,
      markdown: outputMarkdownPath,
      json: outputJsonPath,
    },
    null,
    2,
  ),
);
