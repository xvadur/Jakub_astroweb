import { existsSync, readFileSync, writeFileSync } from "node:fs";

const performanceCsvPath = "ops/ads/seller-audit-daily-performance-2026-06.csv";
const launchPackJsonPath = "ops/ads/seller-audit-launch-pack-2026-06-19.json";
const reportPath = "ops/ads/seller-audit-daily-performance-report-2026-06-19.md";

const headers = [
  "date",
  "channel",
  "campaign",
  "spend_eur",
  "impressions",
  "clicks",
  "booking_start",
  "booking_step_property",
  "booking_step_date",
  "booking_step_contact",
  "completed_bookings",
  "a_leads",
  "b_leads",
  "c_leads",
  "calls_completed",
  "meetings_booked",
  "listing_opportunities",
  "search_terms_reviewed",
  "negatives_added",
  "decision",
  "notes",
];

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
  const parsedHeaders = rows[0] || [];
  return rows.slice(1).map((row) =>
    Object.fromEntries(parsedHeaders.map((header, index) => [header, row[index] || ""])),
  );
};

const numberValue = (row, field) => {
  const raw = String(row[field] || "").replace(",", ".").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid numeric value for ${field}: ${row[field]}`);
  }
  return value;
};

const formatMoney = (value) =>
  new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
};

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

if (!existsSync(performanceCsvPath)) {
  writeFileSync(performanceCsvPath, stringifyCsv([headers]));
}

const rows = readTable(performanceCsvPath);
const launchPack = JSON.parse(readFileSync(launchPackJsonPath, "utf8"));
const failures = [];

rows.forEach((row, index) => {
  const rowNumber = index + 2;
  for (const required of ["date", "channel", "campaign"]) {
    if (!row[required]) failures.push(`Row ${rowNumber}: missing ${required}.`);
  }

  for (const field of headers.slice(3, 19)) {
    try {
      numberValue(row, field);
    } catch (error) {
      failures.push(`Row ${rowNumber}: ${error.message}`);
    }
  }
});

const totals = rows.reduce(
  (acc, row) => {
    acc.spend += numberValue(row, "spend_eur");
    acc.impressions += numberValue(row, "impressions");
    acc.clicks += numberValue(row, "clicks");
    acc.booking_start += numberValue(row, "booking_start");
    acc.booking_step_property += numberValue(row, "booking_step_property");
    acc.booking_step_date += numberValue(row, "booking_step_date");
    acc.booking_step_contact += numberValue(row, "booking_step_contact");
    acc.completed_bookings += numberValue(row, "completed_bookings");
    acc.a_leads += numberValue(row, "a_leads");
    acc.b_leads += numberValue(row, "b_leads");
    acc.c_leads += numberValue(row, "c_leads");
    acc.calls_completed += numberValue(row, "calls_completed");
    acc.meetings_booked += numberValue(row, "meetings_booked");
    acc.listing_opportunities += numberValue(row, "listing_opportunities");
    acc.search_terms_reviewed += numberValue(row, "search_terms_reviewed");
    acc.negatives_added += numberValue(row, "negatives_added");
    return acc;
  },
  {
    spend: 0,
    impressions: 0,
    clicks: 0,
    booking_start: 0,
    booking_step_property: 0,
    booking_step_date: 0,
    booking_step_contact: 0,
    completed_bookings: 0,
    a_leads: 0,
    b_leads: 0,
    c_leads: 0,
    calls_completed: 0,
    meetings_booked: 0,
    listing_opportunities: 0,
    search_terms_reviewed: 0,
    negatives_added: 0,
  },
);

const abLeads = totals.a_leads + totals.b_leads;
const ctr = totals.impressions ? totals.clicks / totals.impressions : NaN;
const cpc = totals.clicks ? totals.spend / totals.clicks : NaN;
const bookingStartRate = totals.clicks ? totals.booking_start / totals.clicks : NaN;
const submitRate = totals.booking_start ? totals.completed_bookings / totals.booking_start : NaN;
const abShare = totals.completed_bookings ? abLeads / totals.completed_bookings : NaN;
const abCpl = abLeads ? totals.spend / abLeads : NaN;

const decisionSignals = [];

if (rows.length === 0) {
  decisionSignals.push("No paid performance rows recorded yet. Launch is prepared, not measured.");
} else {
  if (totals.spend >= 100 && totals.booking_start === 0) {
    decisionSignals.push("Spend >= EUR 100 with no booking_start: stop scaling and inspect keyword/creative to landing match.");
  }

  if (totals.booking_start >= 10 && totals.completed_bookings === 0) {
    decisionSignals.push("Booking starts exist but no submissions: inspect reservation wizard friction.");
  }

  if (totals.completed_bookings >= 5 && Number.isFinite(abShare) && abShare < 0.35) {
    decisionSignals.push("A/B share below 35% after 5+ bookings: tighten copy and keyword intent.");
  }

  if (abLeads >= 3 && Number.isFinite(abCpl) && abCpl <= 150) {
    decisionSignals.push("A/B CPL is within scale threshold: keep running and raise budget slowly.");
  }

  if (totals.clicks >= 30 && totals.search_terms_reviewed === 0) {
    decisionSignals.push("30+ paid clicks with no search-term review logged: review terms before more spend.");
  }

  if (decisionSignals.length === 0) {
    decisionSignals.push("Not enough evidence for scale/stop decision. Keep daily review active.");
  }
}

const byChannel = [...new Set(rows.map((row) => row.channel).filter(Boolean))].map((channel) => {
  const channelRows = rows.filter((row) => row.channel === channel);
  const channelTotals = channelRows.reduce(
    (acc, row) => {
      acc.spend += numberValue(row, "spend_eur");
      acc.clicks += numberValue(row, "clicks");
      acc.completed_bookings += numberValue(row, "completed_bookings");
      acc.abLeads += numberValue(row, "a_leads") + numberValue(row, "b_leads");
      return acc;
    },
    { spend: 0, clicks: 0, completed_bookings: 0, abLeads: 0 },
  );

  return {
    channel,
    ...channelTotals,
    cpc: channelTotals.clicks ? channelTotals.spend / channelTotals.clicks : NaN,
    abCpl: channelTotals.abLeads ? channelTotals.spend / channelTotals.abLeads : NaN,
  };
});

const markdown = `# Seller audit paid performance cockpit

Date: ${today}

Purpose: keep the first paid acquisition test tied to qualified seller leads, not vanity clicks.

## Current State

- Performance rows recorded: ${rows.length}
- Launch links validated by source pack: ${launchPack.launch_readiness.tracked_links}
- Google Search launch rows: ${launchPack.launch_readiness.google_keyword_rows}
- Meta creative rows: ${launchPack.launch_readiness.meta_creative_rows}

## Totals

| Metric | Value |
|---|---:|
| Spend | ${formatMoney(totals.spend)} |
| Impressions | ${totals.impressions} |
| Clicks | ${totals.clicks} |
| CTR | ${formatPercent(ctr)} |
| Avg CPC | ${Number.isFinite(cpc) ? formatMoney(cpc) : "n/a"} |
| Booking starts | ${totals.booking_start} |
| Completed bookings | ${totals.completed_bookings} |
| Booking start / click | ${formatPercent(bookingStartRate)} |
| Submit / booking start | ${formatPercent(submitRate)} |
| A leads | ${totals.a_leads} |
| B leads | ${totals.b_leads} |
| C leads | ${totals.c_leads} |
| A/B leads | ${abLeads} |
| A/B share of bookings | ${formatPercent(abShare)} |
| A/B CPL | ${Number.isFinite(abCpl) ? formatMoney(abCpl) : "n/a"} |
| Calls completed | ${totals.calls_completed} |
| Meetings booked | ${totals.meetings_booked} |
| Listing opportunities | ${totals.listing_opportunities} |
| Search-term reviews | ${totals.search_terms_reviewed} |
| Negatives added | ${totals.negatives_added} |

## By Channel

${
  byChannel.length
    ? `| Channel | Spend | Clicks | Completed bookings | A/B leads | CPC | A/B CPL |
|---|---:|---:|---:|---:|---:|---:|
${byChannel
  .map(
    (row) =>
      `| ${row.channel} | ${formatMoney(row.spend)} | ${row.clicks} | ${row.completed_bookings} | ${row.abLeads} | ${
        Number.isFinite(row.cpc) ? formatMoney(row.cpc) : "n/a"
      } | ${Number.isFinite(row.abCpl) ? formatMoney(row.abCpl) : "n/a"} |`,
  )
  .join("\n")}`
    : "No channel rows recorded yet."
}

## Decision Signals

${decisionSignals.map((item) => `- ${item}`).join("\n")}

## Daily Input CSV

\`${performanceCsvPath}\`

Add one row per channel per day. Do not enter projected data. Only enter numbers copied from Google Ads, Meta Ads, analytics and CRM after the day is reviewed.

Required daily action after spend starts:

1. Export or read spend/click data from Google Ads and Meta.
2. Read booking funnel events from analytics.
3. Grade completed bookings as A/B/C from CRM payload.
4. Ask Jakub for calls, meetings and listing opportunities within 24 hours.
5. Add search terms reviewed and negatives added before increasing budget.

## Validation

${failures.length ? failures.map((item) => `- FAIL: ${item}`).join("\n") : "- CSV structure and numeric fields are valid."}
`;

writeFileSync(reportPath, markdown);

const result = {
  ok: failures.length === 0,
  rows: rows.length,
  spend_eur: Number(totals.spend.toFixed(2)),
  clicks: totals.clicks,
  completed_bookings: totals.completed_bookings,
  ab_leads: abLeads,
  ab_cpl_eur: Number.isFinite(abCpl) ? Number(abCpl.toFixed(2)) : null,
  report: reportPath,
  csv: performanceCsvPath,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
