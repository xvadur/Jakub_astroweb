import { readFileSync, writeFileSync } from "node:fs";

const googleKeywordsPath = "ops/ads/google-search-seller-keywords-2026-06-18.csv";
const googleRsaPath = "ops/ads/google-search-rsa-copy-2026-06-18.csv";
const googleNegativesPath = "ops/ads/google-search-negative-keywords-2026-06-18.csv";
const metaCreativesPath = "ops/ads/meta-seller-creatives-2026-06-19.csv";
const markdownOutputPath = "ops/ads/seller-audit-launch-pack-2026-06-19.md";
const csvOutputPath = "ops/ads/seller-audit-launch-links-2026-06-19.csv";
const jsonOutputPath = "ops/ads/seller-audit-launch-pack-2026-06-19.json";

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

const bookingUrlFromLandingUrl = (landingUrl) => {
  const url = new URL(landingUrl);
  const bookingUrl = new URL("/rezervacia/", url.origin);
  bookingUrl.searchParams.set("zamer", "Predať byt");
  bookingUrl.searchParams.set("entry", "predaj-bytu-bratislava");

  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "gbraid",
    "wbraid",
    "fbclid",
    "msclkid",
  ]) {
    const value = url.searchParams.get(key);
    if (value) bookingUrl.searchParams.set(key, value);
  }

  return bookingUrl.toString();
};

const googleKeywords = readTable(googleKeywordsPath);
const googleRsa = readTable(googleRsaPath);
const googleNegatives = readTable(googleNegativesPath);
const metaCreatives = readTable(metaCreativesPath);

const googleLinks = googleKeywords.map((row) => ({
  channel: "google_search",
  campaign: row.Campaign,
  unit: row["Ad group"],
  asset_id: `${row["Ad group"]} ${row["Match type"]}`.trim(),
  intent_tier: row["Intent tier"],
  landing_url: row["Final URL"],
  booking_url: bookingUrlFromLandingUrl(row["Final URL"]),
  utm_campaign: row["UTM campaign"],
  utm_content: row["UTM content"],
  notes: row.Notes,
}));

const metaLinks = metaCreatives.map((row) => ({
  channel: "meta_paid_social",
  campaign: row.campaign_name,
  unit: row.ad_set_name,
  asset_id: row.creative_id,
  intent_tier: "creative-qualified",
  landing_url: row.landing_url,
  booking_url: bookingUrlFromLandingUrl(row.landing_url),
  utm_campaign: new URL(row.landing_url).searchParams.get("utm_campaign") || "",
  utm_content: row.utm_content,
  notes: row.compliance_notes,
}));

const links = [...googleLinks, ...metaLinks];
const launchReadiness = {
  google_keyword_rows: googleKeywords.length,
  google_rsa_rows: googleRsa.length,
  google_negative_rows: googleNegatives.length,
  meta_creative_rows: metaCreatives.length,
  tracked_links: links.length,
  channels: [...new Set(links.map((row) => row.channel))],
};

const kpiGuardrails = [
  {
    metric: "booking_start_to_submit",
    threshold: ">= 15%",
    action: "Below threshold: inspect reservation wizard friction, required fields, availability and mobile layout.",
  },
  {
    metric: "a_b_booking_share",
    threshold: ">= 35%",
    action: "Below threshold: tighten ad copy around owner relationship, active sale state and time horizon.",
  },
  {
    metric: "google_search_spend_review",
    threshold: "first EUR 50 or 30 clicks",
    action: "Review search terms, add negatives, pause weak ad groups before scaling.",
  },
  {
    metric: "meta_ctr",
    threshold: ">= 0.6% after 1,000 impressions",
    action: "Below threshold: replace hook/visual; do not compensate by broadening housing targeting.",
  },
  {
    metric: "a_b_cost_per_booking",
    threshold: "<= EUR 150 assisted CPL",
    action: "If above threshold after clean tracking: keep outbound as primary and revise landing/creative.",
  },
];

const csvRows = [
  [
    "channel",
    "campaign",
    "unit",
    "asset_id",
    "intent_tier",
    "landing_url",
    "booking_url",
    "utm_campaign",
    "utm_content",
    "notes",
  ],
  ...links.map((row) => [
    row.channel,
    row.campaign,
    row.unit,
    row.asset_id,
    row.intent_tier,
    row.landing_url,
    row.booking_url,
    row.utm_campaign,
    row.utm_content,
    row.notes,
  ]),
];

const markdown = `# Seller audit ads launch pack

Date: ${today}

Purpose: launch paid acquisition only with traceable links and A/B seller booking guardrails.

## Readiness

\`\`\`json
${JSON.stringify(launchReadiness, null, 2)}
\`\`\`

## Launch Order

1. Google Search exact/phrase hot seller intent first.
2. Meta broad housing-compliant creative only as support and retargeting.
3. Route all traffic to \`/predaj-bytu-bratislava/\`.
4. Booking CTA must preserve UTM/click params into \`/rezervacia/\`.
5. Optimize for A/B seller bookings, not cheap raw leads.

## KPI Guardrails

${kpiGuardrails
  .map((row) => `- ${row.metric}: ${row.threshold}. ${row.action}`)
  .join("\n")}

## Tracked Links

CSV export: \`${csvOutputPath}\`

Validation command: \`npm run ads:seller-launch-validate\`

${links
  .slice(0, 18)
  .map(
    (row, index) => `### ${index + 1}. ${row.channel} - ${row.asset_id}

- Campaign: ${row.campaign}
- Unit: ${row.unit}
- Landing: ${row.landing_url}
- Booking: ${row.booking_url}
- Notes: ${row.notes}
`,
  )
  .join("\n")}
`;

writeFileSync(csvOutputPath, stringifyCsv(csvRows));
writeFileSync(
  jsonOutputPath,
  `${JSON.stringify(
    {
      date: today,
      launch_readiness: launchReadiness,
      kpi_guardrails: kpiGuardrails,
      links,
    },
    null,
    2,
  )}\n`,
);
writeFileSync(markdownOutputPath, markdown);

console.log(
  JSON.stringify(
    {
      date: today,
      tracked_links: links.length,
      markdown: markdownOutputPath,
      csv: csvOutputPath,
      json: jsonOutputPath,
    },
    null,
    2,
  ),
);
