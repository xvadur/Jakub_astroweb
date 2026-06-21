import { readFileSync, writeFileSync } from "node:fs";

const paths = {
  launchLinksCsv: "ops/ads/seller-audit-launch-links-2026-06-19.csv",
  googleKeywordsCsv: "ops/ads/google-search-seller-keywords-2026-06-18.csv",
  googleRsaCsv: "ops/ads/google-search-rsa-copy-2026-06-18.csv",
  googleNegativesCsv: "ops/ads/google-search-negative-keywords-2026-06-18.csv",
  metaCreativesCsv: "ops/ads/meta-seller-creatives-2026-06-19.csv",
  performanceCsv: "ops/ads/seller-audit-daily-performance-2026-06.csv",
};

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const outputMarkdownPath = `ops/ads/seller-audit-day-one-test-${today}.md`;
const outputHtmlPath = `ops/ads/seller-audit-day-one-test-${today}.html`;
const outputJsonPath = `ops/ads/seller-audit-day-one-test-${today}.json`;

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

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const launchLinks = readTable(paths.launchLinksCsv);
const googleKeywords = readTable(paths.googleKeywordsCsv);
const googleRsa = readTable(paths.googleRsaCsv);
const googleNegatives = readTable(paths.googleNegativesCsv);
const metaCreatives = readTable(paths.metaCreativesCsv);
const performanceRows = readTable(paths.performanceCsv);

const hotGoogleLinks = launchLinks
  .filter((row) => row.channel === "google_search" && row.intent_tier === "Hot")
  .slice(0, 6);
const warmGoogleLinks = launchLinks
  .filter((row) => row.channel === "google_search" && row.intent_tier === "Warm")
  .filter((row) => ["bez_realitky_exact", "bez_realitky_phrase"].includes(row.utm_content))
  .slice(0, 2);
const googleLaunchRows = [...hotGoogleLinks, ...warmGoogleLinks];
const metaLaunchRows = launchLinks
  .filter((row) => row.channel === "meta_paid_social")
  .filter((row) =>
    ["meta_seller_001_price_before_portal", "meta_seller_003_listing_not_working"].includes(row.utm_content),
  );
const selectedMetaCreatives = metaCreatives.filter((row) =>
  metaLaunchRows.some((link) => link.asset_id === row.creative_id),
);
const selectedAdGroups = [...new Set(googleLaunchRows.map((row) => row.unit))];
const selectedRsa = googleRsa.filter((row) => selectedAdGroups.includes(row["Ad group"]));
const selectedKeywords = googleKeywords.filter((row) =>
  googleLaunchRows.some((link) => link.utm_content === row["UTM content"]),
);

const budget = {
  total_test_cap_eur: 100,
  day_one_cap_eur: 35,
  google_day_one_cap_eur: 25,
  meta_day_one_cap_eur: 10,
  google_three_day_cap_eur: 70,
  meta_three_day_cap_eur: 30,
  review_after_google_clicks: 30,
  review_after_google_spend_eur: 50,
  hard_stop_without_booking_start_eur: 100,
  hard_stop_without_search_term_review_clicks: 30,
};

const killRules = [
  "Ak spend dosiahne 35 EUR v prvý deň a nie je žiadny booking_start, neskalovať; skontrolovať landing/CTA a search terms.",
  "Ak Google dosiahne 30 klikov bez search-term review, zastaviť zvyšovanie rozpočtu a pridať negatíva.",
  "Ak celkový spend dosiahne 100 EUR bez booking_start, paid test stopnúť a nechať primárne outbound.",
  "Ak booking_start existuje, ale 10 začatí neprinesie completed booking, riešiť rezervačný formulár pred ďalším spendom.",
  "Ak completed bookings majú pod 35 % A/B kvality po 5 bookingoch, sprísniť copy a vypnúť široké/warm jednotky.",
];

const scaleRules = [
  "Škáluj iba po prvom A/B booking alebo po jasnom listing opportunity od Jakuba.",
  "Google zvyšuj max o 20-30 % denne, nie skokom.",
  "Meta používaj ako creative/remarketing support, kým nevie preukázať A/B lead lacnejšie než 150 EUR.",
  "Rozpočet presúvaj k jednotkám s booking_start a A/B leadmi, nie podľa CTR samotného.",
];

const errors = [];
const warnings = [];

if (googleLaunchRows.length !== 8) errors.push(`Expected 8 day-one Google launch rows, found ${googleLaunchRows.length}.`);
if (metaLaunchRows.length !== 2) errors.push(`Expected 2 day-one Meta launch rows, found ${metaLaunchRows.length}.`);
if (selectedKeywords.length !== googleLaunchRows.length) {
  errors.push(`Selected keyword rows ${selectedKeywords.length} do not match Google launch rows ${googleLaunchRows.length}.`);
}
if (selectedRsa.length < 3) errors.push(`Expected at least 3 selected RSA ad groups, found ${selectedRsa.length}.`);
if (googleNegatives.length < 20) errors.push(`Expected at least 20 Google negative keywords, found ${googleNegatives.length}.`);
if (performanceRows.length > 0) warnings.push("Paid performance rows already exist; this day-one plan is a launch plan, not a performance report.");

const reviewTemplate = [
  {
    channel: "google_search",
    campaign: "SK | Search | Seller Audit | Bratislava | 20 lead sprint",
    row_note: "Po dni doplň reálne spend/impressions/clicks/booking events/search terms. Nezadávaj projekciu.",
  },
  {
    channel: "meta_paid_social",
    campaign: "SK | Meta | Seller Audit | Bratislava | 20 lead sprint",
    row_note: "Po dni doplň reálne spend/impressions/clicks/booking events. Housing special ad category musí byť zapnutá.",
  },
];

const state = {
  ok: errors.length === 0,
  date: today,
  decision: errors.length ? "NO_GO_FIX_PLAN" : "GO_DAY_ONE_35_EUR_TEST",
  budget,
  google_launch_rows: googleLaunchRows,
  google_keywords: selectedKeywords,
  google_rsa: selectedRsa,
  meta_launch_rows: metaLaunchRows,
  meta_creatives: selectedMetaCreatives,
  negative_keyword_rows: googleNegatives.length,
  kill_rules: killRules,
  scale_rules: scaleRules,
  review_template: reviewTemplate,
  errors,
  warnings,
  outputs: {
    markdown: outputMarkdownPath,
    html: outputHtmlPath,
    json: outputJsonPath,
  },
};

const googleMarkdown = googleLaunchRows
  .map(
    (row, index) => `### ${index + 1}. ${row.unit} - ${row.asset_id}

- Intent: ${row.intent_tier}
- Landing: ${row.landing_url}
- Booking: ${row.booking_url}
- UTM content: ${row.utm_content}
- Notes: ${row.notes}
`,
  )
  .join("\n");

const metaMarkdown = selectedMetaCreatives
  .map(
    (row, index) => `### ${index + 1}. ${row.creative_id} - ${row.headline}

- Format: ${row.format}
- Placement: ${row.placement}
- CTA: ${row.cta}
- Landing: ${row.landing_url}
- Compliance: ${row.compliance_notes}

Primary text:

\`\`\`text
${row.primary_text}
\`\`\`
`,
  )
  .join("\n");

const markdown = `# Seller audit day-one paid test

Date: ${today}

Decision: **${state.decision}**

Purpose: launch the smallest measurable paid acquisition test for qualified seller audit bookings without confusing clicks for progress.

## Budget

\`\`\`json
${JSON.stringify(budget, null, 2)}
\`\`\`

## Launch Scope

- Google Search: ${googleLaunchRows.length} exact/phrase seller-intent rows.
- Meta: ${metaLaunchRows.length} housing-compliant creative rows.
- Negative keywords loaded before Google launch: ${googleNegatives.length}.
- Performance CSV: \`${paths.performanceCsv}\`.

## Day-One Rules

${killRules.map((rule) => `- Kill: ${rule}`).join("\n")}

${scaleRules.map((rule) => `- Scale: ${rule}`).join("\n")}

## Google Day-One Rows

${googleMarkdown}

## Meta Day-One Rows

${metaMarkdown}

## End-Of-Day Review Rows

Do not paste these as fake performance. Use them only as the shape of the real data to enter after reviewing ad platforms, analytics and CRM.

\`\`\`text
date,channel,campaign,spend_eur,impressions,clicks,booking_start,booking_step_property,booking_step_date,booking_step_contact,completed_bookings,a_leads,b_leads,c_leads,calls_completed,meetings_booked,listing_opportunities,search_terms_reviewed,negatives_added,decision,notes
${today},google_search,"SK | Search | Seller Audit | Bratislava | 20 lead sprint",,,,,,,,,,,,,,,,,,
${today},meta_paid_social,"SK | Meta | Seller Audit | Bratislava | 20 lead sprint",,,,,,,,,,,,,,,,,,
\`\`\`

## Commands

\`\`\`bash
npm run ads:seller-launch-gate
npm run ads:seller-daily-performance
npm run leadgen:daily-operator
\`\`\`

## Errors

${errors.length ? errors.map((error) => `- ${error}`).join("\n") : "- none"}

## Warnings

${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- none"}
`;

const linkCards = [...googleLaunchRows, ...metaLaunchRows]
  .map(
    (row) => `<article class="card">
      <div>
        <div class="eyebrow">${escapeHtml(row.channel)} · ${escapeHtml(row.intent_tier)}</div>
        <h2>${escapeHtml(row.unit || row.asset_id)}</h2>
        <p>${escapeHtml(row.notes)}</p>
        <div class="chips"><span>${escapeHtml(row.utm_content)}</span><span>${escapeHtml(row.campaign)}</span></div>
      </div>
      <div class="tools">
        <label>Landing URL</label>
        <textarea readonly>${escapeHtml(row.landing_url)}</textarea>
        <button type="button" data-copy="${escapeHtml(row.landing_url)}">Copy landing</button>
        <label>Booking URL</label>
        <textarea readonly>${escapeHtml(row.booking_url)}</textarea>
        <button type="button" data-copy="${escapeHtml(row.booking_url)}">Copy booking</button>
      </div>
    </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Seller audit day-one paid test</title>
    <style>
      :root { --paper:#fffaf2; --ink:#171411; --muted:#696159; --line:#ded8cf; --soft:#f2ece3; --accent:#8b4e2d; --good:#1f6b4f; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
      header { padding: 28px 0 18px; border-bottom: 1px solid var(--line); }
      h1 { margin: 0; font-size: clamp(30px, 5vw, 54px); line-height: .96; letter-spacing: 0; }
      .sub { margin: 10px 0 0; color: var(--muted); max-width: 780px; }
      .stats, .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .stats { margin-top: 18px; }
      .stats span, .chips span { border: 1px solid var(--line); border-radius: 999px; background: #fff; padding: 6px 10px; font-size: 12px; font-weight: 750; }
      main { display: grid; gap: 22px; padding: 24px 0 56px; }
      section { border-top: 1px solid var(--line); padding-top: 20px; }
      .rules { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
      .rules li { background: #fff; border-left: 4px solid var(--good); padding: 10px 12px; color: var(--muted); }
      .card { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.2fr); gap: 20px; border-top: 1px solid var(--line); padding-top: 18px; }
      .eyebrow { color: var(--accent); font-weight: 850; }
      h2 { margin: 2px 0 6px; font-size: 23px; }
      p { margin: 0 0 8px; color: var(--muted); }
      .tools { display: grid; gap: 8px; }
      label { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
      textarea { width: 100%; min-height: 76px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); padding: 12px; font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      button { min-height: 40px; border: 1px solid var(--ink); border-radius: 7px; background: var(--ink); color: var(--paper); font-weight: 800; cursor: pointer; }
      code { display: block; overflow-x: auto; white-space: pre; border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: var(--soft); font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .toast { position: fixed; right: 18px; bottom: 18px; border-radius: 8px; padding: 12px 14px; background: var(--ink); color: var(--paper); opacity: 0; transform: translateY(8px); transition: 160ms ease; }
      .toast.is-visible { opacity: 1; transform: translateY(0); }
      @media (max-width: 820px) { .card { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <header>
      <div class="shell">
        <h1>Seller audit day-one paid test</h1>
        <p class="sub">Small measured launch: ${escapeHtml(state.decision)}. Keep the first paid spend tied to booking starts, A/B seller leads and search-term review.</p>
        <div class="stats">
          <span>${budget.day_one_cap_eur} EUR day-one cap</span>
          <span>${budget.total_test_cap_eur} EUR total cap</span>
          <span>${googleLaunchRows.length} Google rows</span>
          <span>${metaLaunchRows.length} Meta rows</span>
          <span>${googleNegatives.length} negatives</span>
        </div>
      </div>
    </header>
    <main class="shell">
      <section>
        <h2>Rules</h2>
        <ul class="rules">${[...killRules, ...scaleRules].map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
      </section>
      <section>
        <h2>Launch links</h2>
        ${linkCards}
      </section>
      <section>
        <h2>End-of-day commands</h2>
        <code>npm run ads:seller-daily-performance
npm run leadgen:daily-operator</code>
      </section>
    </main>
    <div class="toast" data-toast>Copied</div>
    <script>
      const toast = document.querySelector("[data-toast]");
      const copyText = async (text) => {
        if (!text) return;
        try { await navigator.clipboard.writeText(text); } catch {}
        if (toast) {
          toast.classList.add("is-visible");
          window.setTimeout(() => toast.classList.remove("is-visible"), 1200);
        }
      };
      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const button = target.closest("[data-copy]");
        if (button instanceof HTMLElement) copyText(button.dataset.copy || "");
      });
    </script>
  </body>
</html>
`;

writeFileSync(outputJsonPath, `${JSON.stringify(state, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);
writeFileSync(outputHtmlPath, html);

console.log(
  JSON.stringify(
    {
      ok: state.ok,
      decision: state.decision,
      day_one_cap_eur: budget.day_one_cap_eur,
      total_test_cap_eur: budget.total_test_cap_eur,
      google_rows: googleLaunchRows.length,
      meta_rows: metaLaunchRows.length,
      negative_keyword_rows: googleNegatives.length,
      errors,
      warnings,
      markdown: outputMarkdownPath,
      html: outputHtmlPath,
      json: outputJsonPath,
    },
    null,
    2,
  ),
);

if (!state.ok) {
  process.exitCode = 1;
}
