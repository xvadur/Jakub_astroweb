import { existsSync, readFileSync, writeFileSync } from "node:fs";

const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const expansionCandidatesPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const markdownOutputPath = "docs/LEADGEN_VOLUME_MODEL_2026-06-19.md";
const csvOutputPath = "ops/leads/leadgen-volume-scenarios-2026-06-19.csv";

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
          const value = String(cell ?? "");
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

const money = new Intl.NumberFormat("sk-SK", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "EUR",
});

const percent = (value) => `${(value * 100).toFixed(1)}%`;
const ceil = (value) => Math.ceil(value);

const validLogRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const expansionCandidates = existsSync(expansionCandidatesPath)
  ? readTable(expansionCandidatesPath).filter((row) => row.candidate_id)
  : [];
const expansionAB = expansionCandidates.filter((row) => row.ai_grade === "A" || row.ai_grade === "B");

const countByStatus = validLogRows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

const statuses = {
  reviewed: candidates.length,
  expansion_reviewed: expansionCandidates.length,
  expansion_ab_reviewed: expansionAB.length,
  total_reviewed_backlog: candidates.length + expansionCandidates.length,
  log_rows: validLogRows.length,
  ready_to_send: countByStatus.ready_to_send || 0,
  contacted:
    (countByStatus.contacted || 0) +
    (countByStatus.replied || 0) +
    (countByStatus.qualified || 0) +
    (countByStatus.sent_to_jakub || 0),
  replied: countByStatus.replied || 0,
  qualified: countByStatus.qualified || 0,
  sent_to_jakub: countByStatus.sent_to_jakub || 0,
  not_fit: countByStatus.not_fit || 0,
  do_not_contact: countByStatus.do_not_contact || 0,
};

const targetQualifiedLeads = 20;
const workingDaysPerMonth = 22;
const monthlyIncomeTarget = 5000;
const adamShareRate = 0.05 * 0.55 * 0.5;
const exampleSalePrices = [200000, 275000, 365000, 500000];

const scenarios = [
  {
    scenario: "low",
    description: "cold manual outreach with weak source fit",
    reply_rate: 0.08,
    audit_accept_rate: 0.5,
    qualified_from_audit_rate: 0.5,
    sends_per_day: 20,
  },
  {
    scenario: "base",
    description: "personalized owner outreach with listing-specific audit angle",
    reply_rate: 0.12,
    audit_accept_rate: 0.6,
    qualified_from_audit_rate: 0.6,
    sends_per_day: 20,
  },
  {
    scenario: "strong",
    description: "tight owner-source fit plus very specific first observation",
    reply_rate: 0.18,
    audit_accept_rate: 0.65,
    qualified_from_audit_rate: 0.65,
    sends_per_day: 20,
  },
  {
    scenario: "aggressive volume",
    description: "same base rates, doubled daily send capacity",
    reply_rate: 0.12,
    audit_accept_rate: 0.6,
    qualified_from_audit_rate: 0.6,
    sends_per_day: 40,
  },
];

const scenarioRows = scenarios.map((scenario) => {
  const qualifiedRate =
    scenario.reply_rate * scenario.audit_accept_rate * scenario.qualified_from_audit_rate;
  const sendsNeeded = ceil(targetQualifiedLeads / qualifiedRate);
  const workingDaysNeeded = ceil(sendsNeeded / scenario.sends_per_day);
  const monthsNeeded = workingDaysNeeded / workingDaysPerMonth;
  const qualifiedPerMonth = scenario.sends_per_day * workingDaysPerMonth * qualifiedRate;

  return {
    ...scenario,
    qualified_rate: qualifiedRate,
    sends_needed_for_20_qualified: sendsNeeded,
    working_days_needed: workingDaysNeeded,
    months_needed: monthsNeeded,
    qualified_per_month: qualifiedPerMonth,
  };
});

const incomeRows = exampleSalePrices.map((salePrice) => {
  const adamRevenue = salePrice * adamShareRate;
  return {
    sale_price: salePrice,
    adam_revenue: adamRevenue,
    closings_needed_for_5000: monthlyIncomeTarget / adamRevenue,
  };
});

const csvRows = [
  [
    "scenario",
    "description",
    "reply_rate",
    "audit_accept_rate",
    "qualified_from_audit_rate",
    "overall_qualified_rate",
    "sends_per_day",
    "sends_needed_for_20_qualified",
    "working_days_needed",
    "months_needed",
    "qualified_per_month",
  ],
  ...scenarioRows.map((row) => [
    row.scenario,
    row.description,
    percent(row.reply_rate),
    percent(row.audit_accept_rate),
    percent(row.qualified_from_audit_rate),
    percent(row.qualified_rate),
    row.sends_per_day,
    row.sends_needed_for_20_qualified,
    row.working_days_needed,
    row.months_needed.toFixed(2),
    row.qualified_per_month.toFixed(1),
  ]),
];

const markdown = `# Leadgen volume model

Date: 2026-06-19

Purpose: turn the 20-qualified-lead target into operating volume. This is not a promise of conversion; it is the working model for how much outreach/ad traffic the system must push through before the result becomes statistically plausible.

## Current Evidence

Manual hunting status from \`${logPath}\`:

\`\`\`text
Reviewed prospects: ${statuses.reviewed}
Expansion prospects: ${statuses.expansion_reviewed}
Expansion A/B prospects: ${statuses.expansion_ab_reviewed}
Total reviewed backlog: ${statuses.total_reviewed_backlog}
Log rows: ${statuses.log_rows}
Ready to send: ${statuses.ready_to_send}
Contacted: ${statuses.contacted}
Replied: ${statuses.replied}
Qualified: ${statuses.qualified}
Sent to Jakub: ${statuses.sent_to_jakub}
Not fit: ${statuses.not_fit}
Do not contact: ${statuses.do_not_contact}
\`\`\`

The current pipeline is prepared, but not yet monetizing. The bottleneck is not copywriting now; it is send volume and follow-up discipline.

## Commercial Formula

\`\`\`text
Adam revenue = sale price * 5% commission * 55% Jakub share * 50% Adam split
Adam revenue = sale price * ${(adamShareRate * 100).toFixed(3)}%
\`\`\`

| Sale price | Adam revenue | Closings needed for ${money.format(monthlyIncomeTarget)}/month |
|---:|---:|---:|
${incomeRows
  .map(
    (row) =>
      `| ${money.format(row.sale_price)} | ${money.format(row.adam_revenue)} | ${row.closings_needed_for_5000.toFixed(2)} |`,
  )
  .join("\n")}

Practical interpretation: one higher-value closing can cover the monthly target, but the reliable version is a pipeline that can produce multiple listing opportunities, not a single lucky deal.

## Manual Outreach Scenarios

Assumption chain:

\`\`\`text
sent messages -> replies -> owners accepting audit -> qualified A/B leads
\`\`\`

| Scenario | Overall qualified rate | Sends/day | Sends needed for 20 qualified | Working days | Qualified/month |
|---|---:|---:|---:|---:|---:|
${scenarioRows
  .map(
    (row) =>
      `| ${row.scenario} | ${percent(row.qualified_rate)} | ${row.sends_per_day} | ${row.sends_needed_for_20_qualified} | ${row.working_days_needed} | ${row.qualified_per_month.toFixed(1)} |`,
  )
  .join("\n")}

## Operating Target

Base case:

\`\`\`text
20 personalized sends/day
22 working days/month
4.3% sent -> qualified lead
= about 19 qualified leads/month
\`\`\`

So the practical target is:

- maintain at least 60 reviewed owner prospects in backlog,
- current reviewed backlog is ${statuses.total_reviewed_backlog} prospects,
- keep 20 verified ready-to-send prospects per working day,
- send first 10 now, then expand to 20/day only after reply handling is clean,
- update every outreach outcome the same day,
- treat 20 qualified leads as a monthly operating target, not as something produced by the first 20 prospects.

## What Would Prove Or Falsify This

After the first 50 sent messages, calculate:

- reply rate,
- audit accepted rate,
- qualified lead rate,
- meetings / Jakub calls booked,
- listing agreements,
- sale value of each sourced opportunity.

If qualified rate is below 2%, the message/source fit is weak and the system needs better prospect selection or a stronger offer. If it is 4-8%, the path to 20 qualified leads/month is real with enough daily send volume.
`;

writeFileSync(markdownOutputPath, markdown);
writeFileSync(csvOutputPath, stringifyCsv(csvRows));

console.log(
  JSON.stringify(
    {
      markdown: markdownOutputPath,
      csv: csvOutputPath,
      current_status: statuses,
      scenarios: scenarioRows.map((row) => ({
        scenario: row.scenario,
        qualified_rate: percent(row.qualified_rate),
        sends_per_day: row.sends_per_day,
        sends_needed_for_20_qualified: row.sends_needed_for_20_qualified,
        working_days_needed: row.working_days_needed,
        qualified_per_month: Number(row.qualified_per_month.toFixed(1)),
      })),
    },
    null,
    2,
  ),
);
