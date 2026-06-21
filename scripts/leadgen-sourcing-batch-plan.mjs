import { existsSync, readFileSync, writeFileSync } from "node:fs";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const paths = {
  backlogRunway: `ops/leadgen-backlog-runway-${today}.json`,
  sourceScan: `ops/leads/manual-owner-hunting-source-scan-${today}.md`,
  sourceScanJson: `ops/leads/manual-owner-hunting-source-scan-${today}.json`,
  sourceScanDeepJson: `ops/leads/manual-owner-hunting-source-scan-deep-${today}.json`,
  sourceImportPackDeepJson: `ops/leads/manual-owner-hunting-source-import-pack-deep-${today}.json`,
};

const outputMarkdownPath = `ops/leadgen-sourcing-batch-plan-${today}.md`;
const outputJsonPath = `ops/leadgen-sourcing-batch-plan-${today}.json`;

const readJson = (path, fallback) => {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
};

const readText = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

const round = (value, digits = 1) => Number(value.toFixed(digits));

const parseEmbeddedJsonAfter = (text, marker) => {
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return null;

  const fenceStart = text.indexOf("```json", markerIndex);
  if (fenceStart === -1) return null;

  const jsonStart = fenceStart + "```json".length;
  const fenceEnd = text.indexOf("```", jsonStart);
  if (fenceEnd === -1) return null;

  try {
    return JSON.parse(text.slice(jsonStart, fenceEnd).trim());
  } catch {
    return null;
  }
};

const backlog = readJson(paths.backlogRunway, {
  current: {},
  scenario_runway: [],
});
const sourceScanText = readText(paths.sourceScan);
const sourceScanSummary =
  readJson(paths.sourceScanJson, { summary: null }).summary ||
  parseEmbeddedJsonAfter(sourceScanText, "Summary:") ||
  {};
const sourceScanDeepSummary = readJson(paths.sourceScanDeepJson, { summary: null }).summary;
const sourceImportPackDeep = readJson(paths.sourceImportPackDeepJson, { summary: null }).summary;
const baseScenario =
  backlog.scenario_runway?.find((row) => row.scenario === "base") || backlog.scenario_runway?.[0] || {};

const sourcingDeficit = Number(baseScenario.sourcing_deficit || 0);
const currentReviewed = Number(backlog.current?.usable_reviewed_prospects || 0);
const immediateCapacity = Number(backlog.current?.immediate_verified_capacity || 0);
const targetReviewedBacklog = Math.max(500, currentReviewed + sourcingDeficit);
const missingToTarget = Math.max(0, targetReviewedBacklog - currentReviewed);
const weeklyReviewedTarget = Math.min(220, Math.max(120, Math.ceil(missingToTarget / 2 / 10) * 10));
const dailyReviewedTarget = Math.ceil(weeklyReviewedTarget / 5);
const toObservedScan = (summary) => {
  if (!summary) return null;
  const rawUniqueSeen = Number(summary.raw_unique_seen || 0);
  const newReviewCandidates = Number(summary.new_review_candidates || 0);
  const yieldRatio = rawUniqueSeen ? newReviewCandidates / rawUniqueSeen : null;

  return {
    scan_label: summary.scan_label || "unknown",
    source_url_count: Number(summary.source_url_count || 0),
    raw_unique_seen: rawUniqueSeen,
    location_prefiltered: Number(summary.location_prefiltered || 0),
    scanned_with_detail: Number(summary.scanned_with_detail || 0),
    new_review_candidates: newReviewCandidates,
    priority_counts: summary.priority_counts || {},
    observed_new_candidate_yield: yieldRatio === null ? null : `${round(yieldRatio * 100, 2)}%`,
    csv: summary.output_paths?.csv || "",
    review_command:
      summary.scan_label === "deep"
        ? "npm run leads:manual-source-review-deep"
        : "npm run leads:manual-source-review",
  };
};
const observedBazosScans = [toObservedScan(sourceScanSummary), toObservedScan(sourceScanDeepSummary)].filter(Boolean);
const bestBazosScan = observedBazosScans.reduce(
  (best, scan) => (!best || scan.new_review_candidates > best.new_review_candidates ? scan : best),
  null,
);

const lanes = [
  {
    lane_id: "bezrealitky_direct_owner",
    name: "Bezrealitky direct-owner listings",
    role: "najvyssi intent, najblizsie k vlastnikovi bez maklera",
    weekly_review_quota: 45,
    expected_ab_quota: 30,
    method:
      "Denne otvorit nove predajne inzeraty v Bratislave a okoli, vyhodit agenturne/rezervovane/low-value, do expansion CSV pridat iba A/B.",
    ai_use:
      "AI robi scoring, normalizuje lokalitu/cenu, navrhne prvu vetu spravy a oznaci weak signals na rucnu kontrolu.",
    compliance:
      "Neukladat telefon/email do repozitara. Kontaktovat cez verejny formular alebo platformu, ak to platforma umoznuje.",
  },
  {
    lane_id: "bezmaklerov_direct_owner",
    name: "Bezmaklerov direct-owner listings",
    role: "druhy najcistejsi zdroj majitelov, dobry na doplnenie batchov",
    weekly_review_quota: 35,
    expected_ab_quota: 22,
    method:
      "Vybrat predaj byt/dom/pozemok pre Bratislavu a satelity, kontrolovat aktivitu a ci nejde o maklera.",
    ai_use:
      "AI extrahuje motiv, riziko, cenu, deal size a pripravi personalizovanu spravu bez spamu.",
    compliance: "Len verejne inzeraty a rucne overenie pred importom.",
  },
  {
    lane_id: "bazos_search_expansion",
    name: "Bazos deeper search and keyword scans",
    role: "objemovy doplnok, nie primarny zdroj",
    weekly_review_quota: 25,
    expected_ab_quota: 8,
    method:
      "Pouzit hlbsie strany a keyword sety: predam byt, predam dom, bez rk, majitel, Bratislava, Senec, Pezinok, Malacky.",
    ai_use:
      "AI deduplikuje URL, vyhadzuje broker signals a priorizuje iba vysoku hodnotu.",
    compliance:
      "Aktualny scan ukazuje nizky yield; Bazos nesmie zjest vacsinu casu, kym neprinesie viac A/B.",
  },
  {
    lane_id: "facebook_owner_groups_manual",
    name: "Facebook local groups manual review",
    role: "vela sukromnych predajcov, ale vyssi manualny bordel",
    weekly_review_quota: 40,
    expected_ab_quota: 20,
    method:
      "Rucne prehladat lokalne realitne skupiny a prispevky typu predam/prenajom zvazuje predaj/bez RK; zapisat iba URL a obchodne poznatky.",
    ai_use:
      "AI z textu prispevku spravi fit score a navrh komentara alebo DM, ale odoslanie ostava rucne.",
    compliance:
      "Ziadne hromadne scrapovanie osobnych profilov. Kontakt len tam, kde je obchodny zamer verejne publikovany.",
  },
  {
    lane_id: "google_indexed_owner_pages",
    name: "Google indexed owner-sale pages",
    role: "dlhy chvost mimo hlavnych portalov",
    weekly_review_quota: 25,
    expected_ab_quota: 10,
    method:
      "Hladat kombinacie site: a frazy bez realitky, predam byt Bratislava, predaj domu majitel; importovat iba aktivne a relevantne.",
    ai_use:
      "AI generuje query sety, klasifikuje vysledky a oznacuje duplicity voci existujucej pipeline.",
    compliance: "Nevytahovat ani neukladat osobne kontakty; pouzit iba verejny kontakt/formular pri realnom odoslani.",
  },
  {
    lane_id: "warm_referral_network",
    name: "Warm referral network",
    role: "mensi objem, vysoka kvalita a najrychlejsia dovera",
    weekly_review_quota: 25,
    expected_ab_quota: 15,
    method:
      "Zoznam 50 ludi/firmiciek v BA okoli, ktori pocuju o predajoch: developeri, spravcovia, hypotekarni ludia, remeselnici, pravnici.",
    ai_use:
      "AI pripravi osobne spravy, referral offer a tracker follow-upov.",
    compliance: "Kontaktovat existujuce vztahy alebo firmy, nie kupene osobne databazy.",
  },
  {
    lane_id: "paid_seller_intent",
    name: "Paid seller-intent capture",
    role: "inbound doplnok k outboundu, meria realny dopyt",
    weekly_review_quota: 25,
    expected_ab_quota: 10,
    method:
      "Spustit maly Google Search test na predaj byt/domu + audit/odhad ceny; Meta iba ako housing special ad category a remarketing/creative test.",
    ai_use:
      "AI robi keyword mining, search-term negatives, copy variants a po kazdom dni performance report.",
    compliance:
      "Housing reklamy musia respektovat special category pravidla. Bez skalovania, kym nie su A/B seller leady.",
  },
];

const weeklyQuota = lanes.reduce((sum, lane) => sum + lane.weekly_review_quota, 0);
const expectedWeeklyAB = lanes.reduce((sum, lane) => sum + lane.expected_ab_quota, 0);
const weeksToTarget = weeklyQuota ? round(missingToTarget / weeklyQuota, 1) : null;
const daysToTargetAtPlan = dailyReviewedTarget ? round(missingToTarget / dailyReviewedTarget, 1) : null;

const automationStack = [
  {
    layer: "source acquisition",
    tools: ["existing Node scripts", "Apify/Crawlee-style actors where legal and useful", "manual review for gated/social sources"],
    output: "review pool without private contact data",
  },
  {
    layer: "classification",
    tools: ["AI scoring prompt", "CSV/JSON validators", "dedupe by source_url"],
    output: "A/B/C grade, deal fit, risk flags, custom first message",
  },
  {
    layer: "workflow automation",
    tools: ["n8n webhooks/wait nodes or current local scripts"],
    output: "booking alert, reply intake, follow-up reminders, Jakub handoff",
  },
  {
    layer: "paid acquisition",
    tools: ["Google Search", "Meta housing special ad category", "UTM + booking conversion tracking"],
    output: "measured seller inquiries, not vanity traffic",
  },
  {
    layer: "CRM",
    tools: ["CSV now", "Google Sheet/Airtable/Notion later"],
    output: "one source of truth for statuses and money attribution",
  },
];

const dailyCadence = [
  {
    timebox: "45 min",
    action: "send current queue",
    command:
      "npm run leads:manual-live-preflight && npm run leads:manual-send-session && npm run leads:manual-validate-send-packet",
    success_metric: "20 real contacted/day once refill is active",
  },
  {
    timebox: "90 min",
    action: "review new owner prospects",
    command: "npm run leads:manual-source-scan-deep && npm run leads:manual-source-review-deep",
    success_metric: `${dailyReviewedTarget} reviewed/day, minimum 20 A/B-worthy prospects/day`,
  },
  {
    timebox: "30 min",
    action: "reply/follow-up triage",
    command: "npm run leads:manual-followups",
    success_metric: "no replied owner waits more than one working day",
  },
  {
    timebox: "20 min",
    action: "paid test audit",
    command: "npm run ads:seller-launch-validate && npm run ads:seller-daily-performance",
    success_metric: "spend only continues when it creates A/B seller leads or useful search-term data",
  },
];

const result = {
  date: today,
  target: {
    qualified_leads: 20,
    revenue_goal_eur_monthly: 5000,
    base_sends_needed_for_20_qualified: Number(baseScenario.sends_needed_for_20_qualified || 463),
    current_usable_reviewed_prospects: currentReviewed,
    immediate_verified_capacity: immediateCapacity,
    sourcing_deficit: sourcingDeficit,
    target_reviewed_backlog: targetReviewedBacklog,
    missing_to_target_reviewed_backlog: missingToTarget,
    weekly_reviewed_target: weeklyReviewedTarget,
    daily_reviewed_target: dailyReviewedTarget,
    plan_weekly_quota: weeklyQuota,
    plan_expected_weekly_ab: expectedWeeklyAB,
    weeks_to_target_at_plan: weeksToTarget,
    days_to_target_at_daily_target: daysToTargetAtPlan,
  },
  observed: {
    bazos_scans: observedBazosScans,
    best_bazos_scan: bestBazosScan,
    source_import_pack_deep: sourceImportPackDeep,
  },
  lanes,
  automation_stack: automationStack,
  daily_cadence: dailyCadence,
  guardrails: [
    "ready_to_send is not a lead; contacted requires a real sent message.",
    "No private phone numbers, emails, or personal profile data in repository files.",
    "Do not scale paid spend until conversion tracking shows A/B seller leads or listing opportunities.",
    "A listing marked reserved/sold/agency/broker is not a send candidate.",
    "Any automation that touches external platforms must respect platform terms and housing-ad rules.",
  ],
  outputs: {
    markdown: outputMarkdownPath,
    json: outputJsonPath,
  },
};

const laneRows = lanes
  .map(
    (lane) =>
      `| ${lane.name} | ${lane.weekly_review_quota} | ${lane.expected_ab_quota} | ${lane.role} |`,
  )
  .join("\n");

const observedBazosRows = observedBazosScans.length
  ? observedBazosScans
      .map(
        (scan) =>
          `| ${scan.scan_label} | ${scan.source_url_count} | ${scan.raw_unique_seen} | ${scan.scanned_with_detail} | ${scan.new_review_candidates} | ${scan.observed_new_candidate_yield || "n/a"} | \`${scan.review_command}\` |`,
      )
      .join("\n")
  : "| n/a | 0 | 0 | 0 | 0 | n/a | n/a |";

const laneDetails = lanes
  .map(
    (lane, index) => `### ${index + 1}. ${lane.name}

- Role: ${lane.role}
- Weekly review quota: ${lane.weekly_review_quota}
- Expected A/B quota: ${lane.expected_ab_quota}
- Method: ${lane.method}
- AI use: ${lane.ai_use}
- Compliance: ${lane.compliance}
`,
  )
  .join("\n");

const stackRows = automationStack
  .map((item) => `| ${item.layer} | ${item.tools.join(", ")} | ${item.output} |`)
  .join("\n");

const cadenceRows = dailyCadence
  .map((item) => `| ${item.timebox} | ${item.action} | \`${item.command}\` | ${item.success_metric} |`)
  .join("\n");

const markdown = `# Leadgen sourcing batch plan

Date: ${today}

Purpose: turn the EUR 5,000/month target into a repeatable sourcing machine for 20 qualified seller leads.

## Hard Target

\`\`\`json
${JSON.stringify(result.target, null, 2)}
\`\`\`

## Observed Bottleneck

Current Bazos scans:

| Scan | Source URLs | Raw unique seen | Scanned with detail | New A/B review candidates | Yield | Review command |
|---|---:|---:|---:|---:|---:|---|
${observedBazosRows}

Append-ready source import pack: ${sourceImportPackDeep?.candidate_rows ?? 0} candidates from ${sourceImportPackDeep?.source_scan_json || "n/a"}.

Interpretation: Bazos can produce a small daily review pool when scanned deeply, but it is still too thin to carry the whole target alone. The plan needs several sourcing lanes running in parallel, with weekly quotas and strict review rules.

## Weekly Source Quotas

| Lane | Reviewed/week | Expected A/B/week | Role |
|---|---:|---:|---|
${laneRows}

Planned reviewed/week: ${weeklyQuota}
Expected A/B/week: ${expectedWeeklyAB}
Estimated time to target reviewed backlog: ${weeksToTarget} weeks at this mix.

## Lane Instructions

${laneDetails}

## Automation Stack

| Layer | Tools | Output |
|---|---|---|
${stackRows}

## Daily Cadence

| Timebox | Action | Command | Success metric |
|---|---|---|---|
${cadenceRows}

## Guardrails

${result.guardrails.map((item) => `- ${item}`).join("\n")}

## Next Operator Command

\`\`\`bash
npm run leadgen:backlog-runway && npm run leadgen:sourcing-batch-plan
\`\`\`
`;

writeFileSync(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);

console.log(
  JSON.stringify(
    {
      date: today,
      current_reviewed: currentReviewed,
      sourcing_deficit: sourcingDeficit,
      weekly_quota: weeklyQuota,
      expected_weekly_ab: expectedWeeklyAB,
      weeks_to_target: weeksToTarget,
      markdown: outputMarkdownPath,
      json: outputJsonPath,
    },
    null,
    2,
  ),
);
