import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const paths = {
  launchPackJson: "ops/ads/seller-audit-launch-pack-2026-06-19.json",
  launchLinksCsv: "ops/ads/seller-audit-launch-links-2026-06-19.csv",
  performanceCsv: "ops/ads/seller-audit-daily-performance-2026-06.csv",
  performanceReport: "ops/ads/seller-audit-daily-performance-report-2026-06-19.md",
  markdown: `ops/ads/seller-audit-paid-launch-gate-${today}.md`,
  html: `ops/ads/seller-audit-paid-launch-gate-${today}.html`,
  json: `ops/ads/seller-audit-paid-launch-gate-${today}.json`,
};

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

const run = (label, command, args) => {
  const startedAt = Date.now();

  try {
    const stdout = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return {
      label,
      ok: true,
      ms: Date.now() - startedAt,
      command: [command, ...args].join(" "),
      stdout: stdout.trim().slice(-6000),
      error: "",
    };
  } catch (error) {
    return {
      label,
      ok: false,
      ms: Date.now() - startedAt,
      command: [command, ...args].join(" "),
      stdout: error.stdout ? String(error.stdout).trim().slice(-6000) : "",
      error: error.stderr ? String(error.stderr).trim().slice(-6000) : error.message,
    };
  }
};

const parseJsonFromStdout = (stdout, fallback = {}) => {
  const lines = String(stdout || "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().startsWith("{"));
  if (start === -1) return fallback;

  try {
    return JSON.parse(lines.slice(start).join("\n"));
  } catch {
    return fallback;
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const steps = [
  run("launch_pack", "npm", ["run", "ads:seller-launch-pack"]),
  run("launch_validate", "npm", ["run", "ads:seller-launch-validate"]),
  run("daily_performance", "npm", ["run", "ads:seller-daily-performance"]),
  run("analytics_conversion", "npm", ["run", "test:analytics-conversion"]),
];
const failures = steps.filter((step) => !step.ok);
const launchValidate = parseJsonFromStdout(steps.find((step) => step.label === "launch_validate")?.stdout, {});
const dailyPerformance = parseJsonFromStdout(steps.find((step) => step.label === "daily_performance")?.stdout, {});
const launchPack = JSON.parse(readFileSync(paths.launchPackJson, "utf8"));
const links = readTable(paths.launchLinksCsv);
const performanceRows = readTable(paths.performanceCsv);
const googleLinks = links.filter((row) => row.channel === "google_search");
const metaLinks = links.filter((row) => row.channel === "meta_paid_social");
const blockers = [];
const warnings = [];

if (failures.length) blockers.push(`Failed paid prerequisites: ${failures.map((step) => step.label).join(", ")}`);
if (!launchValidate.ok) blockers.push(`Launch link validation failed: ${(launchValidate.failures || []).join("; ")}`);
if ((launchPack.launch_readiness?.tracked_links || 0) !== links.length) {
  blockers.push(`Launch pack tracked_links ${launchPack.launch_readiness?.tracked_links || 0} != link CSV rows ${links.length}.`);
}
if (googleLinks.length < 12) blockers.push(`Google search launch rows below minimum: ${googleLinks.length}.`);
if (metaLinks.length < 3) blockers.push(`Meta creative launch rows below minimum: ${metaLinks.length}.`);
if ((launchPack.launch_readiness?.google_negative_rows || 0) < 20) {
  blockers.push(`Google negatives below minimum: ${launchPack.launch_readiness?.google_negative_rows || 0}.`);
}
if (!dailyPerformance.ok) blockers.push(`Daily performance CSV invalid: ${(dailyPerformance.failures || []).join("; ")}`);
if ((dailyPerformance.spend_eur || 0) > 0 && performanceRows.length === 0) {
  blockers.push("Spend is non-zero but no performance rows are available.");
}
if ((dailyPerformance.spend_eur || 0) === 0) warnings.push("Paid spend is still 0; this is a launch-readiness gate, not performance proof.");

const firstTest = {
  objective: "qualified seller audit booking",
  duration_days: 3,
  max_total_budget_eur: 100,
  google_search_budget_eur: 70,
  meta_paid_social_budget_eur: 30,
  daily_stop_loss_eur_without_booking_start: 35,
  review_after_google_clicks: 30,
  review_after_spend_eur: 50,
  scale_only_if: [
    "tracking links preserve UTM into /rezervacia/",
    "booking_start events appear before EUR 100 total spend",
    "completed bookings can be graded A/B/C",
    "search terms reviewed before increasing Google budget",
  ],
};

const go = blockers.length === 0;
const result = {
  ok: go,
  date: today,
  decision: go ? "GO_SMALL_PAID_TEST" : "NO_GO",
  blockers,
  warnings,
  metrics: {
    tracked_links: links.length,
    google_search_rows: googleLinks.length,
    meta_creative_rows: metaLinks.length,
    google_negative_rows: launchPack.launch_readiness?.google_negative_rows || 0,
    performance_rows: performanceRows.length,
    spend_eur: dailyPerformance.spend_eur || 0,
    clicks: dailyPerformance.clicks || 0,
    completed_bookings: dailyPerformance.completed_bookings || 0,
    ab_leads: dailyPerformance.ab_leads || 0,
    ab_cpl_eur: dailyPerformance.ab_cpl_eur,
  },
  first_test: firstTest,
  files: {
    launch_pack: paths.launchPackJson,
    launch_links: paths.launchLinksCsv,
    performance_csv: paths.performanceCsv,
    performance_report: paths.performanceReport,
    paid_launch_gate_markdown: paths.markdown,
    paid_launch_gate_html: paths.html,
    paid_launch_gate_json: paths.json,
  },
  commands: {
    launch_validate: "npm run ads:seller-launch-validate",
    daily_performance: "npm run ads:seller-daily-performance",
    after_day_review: "npm run ads:seller-daily-performance && npm run leadgen:daily-operator",
  },
  steps,
  outputs: {
    markdown: paths.markdown,
    html: paths.html,
    json: paths.json,
  },
};

const markdown = `# Seller audit paid launch gate

Date: ${today}

Decision: **${result.decision}**

## Metrics

\`\`\`json
${JSON.stringify(result.metrics, null, 2)}
\`\`\`

## Blockers

${blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none"}

## Warnings

${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- none"}

## First Test

- Duration: ${firstTest.duration_days} days
- Max total budget: EUR ${firstTest.max_total_budget_eur}
- Google Search: EUR ${firstTest.google_search_budget_eur}
- Meta paid social: EUR ${firstTest.meta_paid_social_budget_eur}
- Stop-loss: EUR ${firstTest.daily_stop_loss_eur_without_booking_start}/day without booking_start
- Review Google search terms after ${firstTest.review_after_google_clicks} clicks or EUR ${firstTest.review_after_spend_eur}

Scale only if:

${firstTest.scale_only_if.map((item) => `- ${item}`).join("\n")}

## Operator Flow

1. Use \`${paths.launchLinksCsv}\` as the source of landing and booking URLs.
2. Launch only the small test budget above.
3. After each day, fill one row per channel in \`${paths.performanceCsv}\`.
4. Run:

\`\`\`bash
npm run ads:seller-daily-performance
npm run leadgen:daily-operator
\`\`\`
`;

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Seller Audit Paid Launch Gate</title>
    <style>
      :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1b1d21; background: #f4f1ea; }
      body { margin: 0; padding: 32px; }
      main { max-width: 1040px; margin: 0 auto; }
      h1 { font-size: 32px; margin: 0 0 8px; letter-spacing: 0; }
      h2 { font-size: 18px; margin: 28px 0 12px; }
      .decision { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border-radius: 6px; font-weight: 700; background: ${go ? "#dff3dd" : "#f8d7da"}; color: ${go ? "#14571a" : "#7a1620"}; border: 1px solid ${go ? "#9ed59a" : "#e5a0a6"}; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-top: 20px; }
      .metric, .panel { background: #fff; border: 1px solid #dedbd2; border-radius: 8px; padding: 14px; }
      .metric span { display: block; font-size: 12px; color: #646861; }
      .metric strong { display: block; margin-top: 6px; font-size: 22px; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 6px 0; }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      pre { white-space: pre-wrap; background: #20242b; color: #f7f3ea; border-radius: 8px; padding: 14px; }
      @media (max-width: 680px) { body { padding: 18px; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Seller Audit Paid Launch Gate</h1>
      <div class="decision">${escapeHtml(result.decision)}</div>
      <section class="grid">
        ${Object.entries(result.metrics)
          .map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "n/a")}</strong></div>`)
          .join("")}
      </section>
      <section class="panel"><h2>Blockers</h2><ul>${(blockers.length ? blockers : ["none"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
      <section class="panel"><h2>Warnings</h2><ul>${(warnings.length ? warnings : ["none"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
      <section class="panel">
        <h2>First Test</h2>
        <ul>
          <li>3 days, max EUR 100 total</li>
          <li>Google Search EUR 70</li>
          <li>Meta paid social EUR 30</li>
          <li>Stop if no booking_start after EUR 35 in a day</li>
        </ul>
        <pre>npm run ads:seller-daily-performance
npm run leadgen:daily-operator</pre>
      </section>
    </main>
  </body>
</html>
`;

writeFileSync(paths.json, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(paths.markdown, markdown);
writeFileSync(paths.html, html);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      decision: result.decision,
      blockers,
      warnings,
      metrics: result.metrics,
      markdown: paths.markdown,
      html: paths.html,
      json: paths.json,
    },
    null,
    2,
  ),
);

if (!result.ok) {
  process.exit(1);
}
