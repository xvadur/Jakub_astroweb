import { existsSync, readFileSync, writeFileSync } from "node:fs";

const paths = {
  manualLog: "ops/leads/manual-owner-hunting-log-2026-06-19.csv",
  livePreflight: "ops/leads/manual-owner-hunting-live-preflight-2026-06-19.json",
  nextWave: "ops/leads/manual-owner-hunting-next-wave-2026-06-19.json",
  volumeScenarios: "ops/leads/leadgen-volume-scenarios-2026-06-19.csv",
  paidPerformance: "ops/ads/seller-audit-daily-performance-2026-06.csv",
  adsLaunchPack: "ops/ads/seller-audit-launch-pack-2026-06-19.json",
  adsLaunchLinks: "ops/ads/seller-audit-launch-links-2026-06-19.csv",
  sendSessionHtml: "ops/leads/manual-owner-hunting-send-session-2026-06-19.html",
  sendSessionCloseout: "ops/leads/manual-owner-hunting-send-session-closeout-2026-06-19.md",
  sendPacketCsv: "ops/leads/manual-owner-hunting-send-packet-2026-06-19.csv",
  sessionReportTemplate: "ops/leads/manual-owner-hunting-session-report-template-2026-06-19.txt",
  auditReplyPack: "ops/leads/manual-owner-hunting-audit-reply-pack-2026-06-19.html",
  followupPack: "ops/leads/manual-owner-hunting-followup-triage-2026-06-19.html",
  nextWaveHtml: "ops/leads/manual-owner-hunting-next-wave-2026-06-19.html",
  replyIntake: "ops/leads/manual-owner-hunting-reply-intake-2026-06-19.md",
  paidReport: "ops/ads/seller-audit-daily-performance-report-2026-06-19.md",
  paidDayOnePlan: "ops/ads/seller-audit-day-one-test-2026-06-19.html",
  sendDaySimulation: "ops/leadgen-send-day-simulation-2026-06-19.md",
  backlogRunway: "ops/leadgen-backlog-runway-2026-06-19.md",
  sourcingBatchPlan: "ops/leadgen-sourcing-batch-plan-2026-06-19.md",
};

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const outputMd = `ops/leadgen-daily-operator-${today}.md`;
const outputHtml = `ops/leadgen-daily-operator-${today}.html`;
const outputJson = `ops/leadgen-daily-operator-${today}.json`;

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
  if (!existsSync(path)) return [];
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0] || [];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const readJson = (path, fallback) => {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
};

const numberValue = (row, field) => {
  const raw = String(row[field] || "").replace(",", ".").trim();
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatMoney = (value) =>
  new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);

const manualRows = readTable(paths.manualLog).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const paidRows = readTable(paths.paidPerformance);
const livePreflight = readJson(paths.livePreflight, { counts: {}, results: [] });
const nextWave = readJson(paths.nextWave, { counts: {} });
const launchPack = readJson(paths.adsLaunchPack, { launch_readiness: {} });
const launchLinks = readTable(paths.adsLaunchLinks);
const volumeRows = readTable(paths.volumeScenarios);
const baseScenario = volumeRows.find((row) => row.scenario === "base") || {};

const statusCounts = manualRows.reduce((counts, row) => {
  counts[row.status] = (counts[row.status] || 0) + 1;
  return counts;
}, {});

const paidTotals = paidRows.reduce(
  (acc, row) => {
    acc.spend += numberValue(row, "spend_eur");
    acc.impressions += numberValue(row, "impressions");
    acc.clicks += numberValue(row, "clicks");
    acc.booking_start += numberValue(row, "booking_start");
    acc.completed_bookings += numberValue(row, "completed_bookings");
    acc.a_leads += numberValue(row, "a_leads");
    acc.b_leads += numberValue(row, "b_leads");
    acc.c_leads += numberValue(row, "c_leads");
    acc.calls_completed += numberValue(row, "calls_completed");
    acc.meetings_booked += numberValue(row, "meetings_booked");
    acc.listing_opportunities += numberValue(row, "listing_opportunities");
    return acc;
  },
  {
    spend: 0,
    impressions: 0,
    clicks: 0,
    booking_start: 0,
    completed_bookings: 0,
    a_leads: 0,
    b_leads: 0,
    c_leads: 0,
    calls_completed: 0,
    meetings_booked: 0,
    listing_opportunities: 0,
  },
);

const manual = {
  ready_to_send: statusCounts.ready_to_send || 0,
  contacted: statusCounts.contacted || 0,
  replied: statusCounts.replied || 0,
  qualified: statusCounts.qualified || 0,
  sent_to_jakub: statusCounts.sent_to_jakub || 0,
  not_fit: statusCounts.not_fit || 0,
  do_not_contact: statusCounts.do_not_contact || 0,
  next_wave_import_ready: nextWave.counts?.import_ready || 0,
  next_wave_do_not_import: nextWave.counts?.do_not_import || 0,
};

manual.immediate_send_capacity = manual.ready_to_send + manual.next_wave_import_ready;
manual.target_daily_sends = 20;
manual.daily_send_gap = Math.max(0, manual.target_daily_sends - manual.immediate_send_capacity);
manual.remaining_to_20_qualified = Math.max(0, 20 - manual.qualified - manual.sent_to_jakub);
manual.live_preflight = {
  date: livePreflight.date || "",
  queue_size: livePreflight.queue_size || 0,
  send_ok: livePreflight.counts?.send_ok || 0,
  manual_check: livePreflight.counts?.manual_check || 0,
  do_not_send: livePreflight.counts?.do_not_send || 0,
  ok_to_continue: livePreflight.ok_to_continue === true,
};

const paid = {
  rows: paidRows.length,
  spend_eur: Number(paidTotals.spend.toFixed(2)),
  impressions: paidTotals.impressions,
  clicks: paidTotals.clicks,
  booking_start: paidTotals.booking_start,
  completed_bookings: paidTotals.completed_bookings,
  a_b_leads: paidTotals.a_leads + paidTotals.b_leads,
  c_leads: paidTotals.c_leads,
  calls_completed: paidTotals.calls_completed,
  meetings_booked: paidTotals.meetings_booked,
  listing_opportunities: paidTotals.listing_opportunities,
  a_b_cpl_eur:
    paidTotals.a_leads + paidTotals.b_leads
      ? Number((paidTotals.spend / (paidTotals.a_leads + paidTotals.b_leads)).toFixed(2))
      : null,
};

const ads = {
  launch_links: launchLinks.length,
  launch_pack_links: launchPack.launch_readiness?.tracked_links || 0,
  google_keyword_rows: launchPack.launch_readiness?.google_keyword_rows || 0,
  meta_creative_rows: launchPack.launch_readiness?.meta_creative_rows || 0,
  launch_links_match: launchLinks.length === (launchPack.launch_readiness?.tracked_links || 0),
};

const nextActions = [];

if (manual.live_preflight.do_not_send > 0) {
  const blockedIds = (livePreflight.results || [])
    .filter((row) => row.decision === "do_not_send")
    .map((row) => row.candidate_id)
    .join(", ");

  nextActions.push({
    priority: "P0",
    title: "Stopnúť mŕtve inzeráty pred odoslaním",
    why: `${manual.live_preflight.do_not_send} kandidátov zlyhalo live preflight. Neodosielať queue, kým nie sú označení ako not_fit. IDs: ${blockedIds || "pozri preflight report"}.`,
    file: paths.livePreflight,
    command: "npm run leads:manual-live-preflight",
  });
}

if (manual.ready_to_send > 0 && manual.live_preflight.do_not_send === 0) {
  nextActions.push({
    priority: "P0",
    title: "Odoslať aktuálnu outbound queue",
    why: `${manual.ready_to_send} kandidátov čaká na ručné odoslanie; live preflight má ${manual.live_preflight.send_ok}/${manual.ready_to_send} send_ok. Bez odoslania ostáva contacted = 0.`,
    file: paths.sendSessionHtml,
    command: "npm run leadgen:first-send-launch",
  });
}

if (manual.ready_to_send === 0 && manual.next_wave_import_ready > 0) {
  nextActions.push({
    priority: "P0",
    title: "Importnúť ďalšiu outbound wave",
    why: `${manual.next_wave_import_ready} kandidátov prešlo live preflight a môžu doplniť send queue.`,
    file: paths.nextWaveHtml,
    command: "npm run leads:manual-import-expansion -- --from-next-wave --apply --follow-up=2026-06-24",
  });
}

if (manual.contacted > 0 && manual.replied + manual.qualified + manual.sent_to_jakub === 0) {
  nextActions.push({
    priority: "P1",
    title: "Spracovať odpovede a follow-up",
    why: "Po odoslaní musí nasledovať rýchly audit reply alebo jeden kontrolovaný follow-up po 48-72h. Bez toho pipeline zamrzne na contacted.",
    file: paths.followupPack,
    command: "npm run leads:manual-audit-reply-pack && npm run leads:manual-reply-triage && npm run leads:manual-followups && npm run leads:manual-handoff",
  });
}

if (manual.ready_to_send > 0 && manual.contacted === 0) {
  nextActions.push({
    priority: "P1",
    title: "Mať pripravený druhý krok pre každé áno",
    why: "Outbound sľubuje 3 konkrétne postrehy. Audit reply pack zabezpečí, že pozitívna odpoveď dostane hodnotu hneď, nie až po ďalšom rozmýšľaní.",
    file: paths.auditReplyPack,
    command: "npm run leads:manual-audit-reply-pack",
  });
}

if (paid.rows === 0) {
  nextActions.push({
    priority: "P1",
    title: "Spustiť iba 35 EUR day-one paid test",
    why: "Paid tracking je pripravený, ale nemá žiadne reálne dáta. Prvý spend musí mať rozpočtový cap, UTM linky a stop pravidlá.",
    file: paths.paidDayOnePlan,
    command: "npm run ads:seller-launch-gate && npm run ads:seller-day-one-plan",
  });
}

if (manual.immediate_send_capacity >= manual.target_daily_sends) {
  nextActions.push({
    priority: "P2",
    title: "Doplniť owner-prospect backlog",
    why: "Prvý 20-touch deň je pripravený, ale base model potrebuje stovky odoslaní. Sourcing musí bežať paralelne so sendovaním.",
    file: paths.sourcingBatchPlan,
    command: "npm run leadgen:backlog-runway && npm run leadgen:sourcing-batch-plan && npm run leads:manual-validate-expansion",
  });
}

if (paid.rows > 0 && paid.clicks >= 30 && paid.booking_start === 0) {
  nextActions.push({
    priority: "P0",
    title: "Zastaviť škálovanie paid testu",
    why: "30+ klikov bez booking_start naznačuje problém s intentom, kreatívou alebo landing page.",
    file: paths.paidReport,
    command: "npm run ads:seller-daily-performance",
  });
}

if (nextActions.length === 0) {
  nextActions.push({
    priority: "P1",
    title: "Udržať denný rytmus a čakať na nové dáta",
    why: "Nie je detegovaný nový urgentný gate. Pokračuj v dennom review a nezvyšuj spend bez dôkazov.",
    file: outputMd,
    command: "npm run leadgen:daily-operator",
  });
}

const riskFlags = [];

if (manual.contacted === 0) {
  riskFlags.push("Outbound zatiaľ negeneruje príjem, lebo ešte nie je zaznamenaný žiadny reálny kontakt.");
}

if (manual.ready_to_send > 0 && manual.live_preflight.send_ok < manual.ready_to_send) {
  riskFlags.push("Ready queue nie je celá potvrdená live preflightom. Pred odoslaním skontroluj stop/manual_check riadky.");
}

if (manual.qualified + manual.sent_to_jakub === 0) {
  riskFlags.push("Cieľ 20 kvalifikovaných leadov je stále 0/20. Pripravená queue sa nesmie rátať ako lead.");
}

if (!ads.launch_links_match) {
  riskFlags.push("Počet ads launch linkov nesedí medzi CSV a JSON launch packom.");
}

if (paid.rows === 0) {
  riskFlags.push("Paid acquisition je pripravený, ale ešte nemá merané výkonnostné dáta.");
}

const commercial = {
  adam_share_rate: 0.01375,
  revenue_at_200k_eur: 2750,
  revenue_at_365k_eur: 5018.75,
  closings_needed_at_200k_for_5000: 1.82,
  base_sends_for_20_qualified: baseScenario.sends_needed_for_20_qualified || "463",
  base_working_days_for_20_qualified: baseScenario.working_days_needed || "24",
};

const executionRunbook = [];

if (manual.ready_to_send > 0 && manual.live_preflight.do_not_send === 0) {
  executionRunbook.push(
    {
      label: "1. Otvor send session",
      detail: `Odošli ${manual.ready_to_send} správ z validovaného HTML. Kontakty nikam neukladaj do repozitára.`,
      file: paths.sendSessionHtml,
      command: "",
    },
    {
      label: "2. Označ sent alebo stop",
      detail: "V HTML session označ každý riadok podľa reality. Lokálne poznámky neobsahujú telefóny ani emaily.",
      file: paths.sendSessionHtml,
      command: "",
    },
    {
      label: "3. Dry-run closeout",
      detail: "V send session klikni na Kopírovať dry-run closeout. Skopírovaný príkaz už obsahuje aktuálny session report.",
      file: paths.sendSessionHtml,
      command: "",
    },
    {
      label: "4. Apply a refill",
      detail:
        manual.immediate_send_capacity >= manual.target_daily_sends
          ? "Po úspešnom dry-rune klikni na Kopírovať apply + refill. Skopírovaný príkaz aplikuje report a doplní ďalšiu vlnu."
          : "Po úspešnom dry-rune aplikuj iba closeout bez refillovania.",
      file: paths.sendSessionHtml,
      command: "",
    },
    {
      label: "5. Otvor audit reply pack",
      detail: "Keď niekto odpovie áno alebo pošlite, skopíruj pripravené 3 postrehy a po reakcii vypýtaj call permission pre Jakuba.",
      file: paths.auditReplyPack,
      command: "npm run leads:manual-audit-reply-pack",
    },
    {
      label: "6. Otvor follow-up pack",
      detail: "Po 48-72h bez odpovede pošli iba jeden krátky follow-up a ďalej čakaj na reakciu.",
      file: paths.followupPack,
      command: "npm run leads:manual-followups",
    },
  );
} else if (manual.ready_to_send === 0 && manual.next_wave_import_ready > 0) {
  executionRunbook.push({
    label: "1. Refill queue",
    detail: "Aktuálna queue je prázdna; importni ďalšiu live-checked wave.",
    file: paths.nextWaveHtml,
    command: "npm run leadgen:post-send-refresh -- --apply-next-wave",
  });
} else {
  executionRunbook.push({
    label: "1. Source more owner candidates",
    detail: "Nie je dosť pripravených riadkov na ďalší send day; doplň backlog.",
    file: paths.sourcingBatchPlan,
    command: "npm run leadgen:sourcing-batch-plan",
  });
}

const state = {
  date: today,
  manual,
  paid,
  ads,
  commercial,
  execution_runbook: executionRunbook,
  next_actions: nextActions,
  risk_flags: riskFlags,
  outputs: {
    markdown: outputMd,
    html: outputHtml,
    json: outputJson,
  },
};

const actionMarkdown = nextActions
  .map(
    (action, index) => `### ${index + 1}. ${action.priority} - ${action.title}

- Why: ${action.why}
- File: \`${action.file}\`
- Command: \`${action.command}\`
`,
  )
  .join("\n");

const executionMarkdown = executionRunbook
  .map(
    (step) => `### ${step.label}

- Detail: ${step.detail}
- File: \`${step.file}\`
${step.command ? `- Command:\n\n\`\`\`bash\n${step.command}\n\`\`\`` : ""}
`,
  )
  .join("\n");

const markdown = `# Leadgen daily operator

Date: ${today}

Purpose: one daily control layer for the 20 qualified seller lead sprint and the EUR 5,000/month path.

## One Truth

\`\`\`json
${JSON.stringify(
  {
    manual,
    paid,
    ads,
  },
  null,
  2,
)}
\`\`\`

## Next Actions

${actionMarkdown}

## Today's Execution Block

${executionMarkdown}

## Commercial Frame

- Adam share formula: sale price * 1.375%.
- EUR 200,000 closing: about ${formatMoney(commercial.revenue_at_200k_eur)}.
- EUR 365,000 closing: about ${formatMoney(commercial.revenue_at_365k_eur)}.
- EUR 5,000/month needs about ${commercial.closings_needed_at_200k_for_5000} closings at EUR 200k, or one stronger EUR 365k deal.
- Base model for 20 qualified leads: ${commercial.base_sends_for_20_qualified} sends over ${commercial.base_working_days_for_20_qualified} working days at 20 sends/day.

## Risk Flags

${riskFlags.map((flag) => `- ${flag}`).join("\n")}

## Non-Negotiable Status Rules

- \`ready_to_send\` is not a lead.
- \`contacted\` requires a real sent message.
- \`replied\` requires meaningful owner engagement.
- \`qualified\` requires call, valuation, or continuation permission.
- \`sent_to_jakub\` requires an actual handoff to Jakub.
- Paid spend is not successful until it creates A/B seller bookings or listing opportunities.
`;

const actionHtml = nextActions
  .map(
    (action) => `<article class="action">
      <div class="priority">${escapeHtml(action.priority)}</div>
      <div>
        <h2>${escapeHtml(action.title)}</h2>
        <p>${escapeHtml(action.why)}</p>
        <a href="../${escapeHtml(action.file)}">${escapeHtml(action.file)}</a>
      </div>
      <code>${escapeHtml(action.command)}</code>
    </article>`,
  )
  .join("\n");

const executionHtml = executionRunbook
  .map(
    (step) => `<article class="action">
      <div class="priority">${escapeHtml(step.label.split(".")[0])}</div>
      <div>
        <h2>${escapeHtml(step.label.replace(/^\d+\.\s*/, ""))}</h2>
        <p>${escapeHtml(step.detail)}</p>
        <a href="../${escapeHtml(step.file)}">${escapeHtml(step.file)}</a>
      </div>
      ${step.command ? `<code>${escapeHtml(step.command)}</code>` : "<code>Manual step</code>"}
    </article>`,
  )
  .join("\n");

const metric = (label, value) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Leadgen daily operator</title>
    <style>
      :root { --paper:#fffaf2; --ink:#171411; --muted:#696159; --line:#ded8cf; --soft:#f2ece3; --accent:#8b4e2d; --bad:#8d2f1b; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
      header { padding: 28px 0 20px; border-bottom: 1px solid var(--line); }
      h1 { margin: 0; font-size: clamp(30px, 5vw, 56px); line-height: .96; letter-spacing: 0; }
      .sub { margin: 10px 0 0; color: var(--muted); max-width: 760px; }
      .metrics { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 10px; margin: 22px 0 0; }
      .metric { min-height: 76px; border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 12px; display: grid; align-content: space-between; }
      .metric strong { font-size: 28px; line-height: 1; }
      .metric span { color: var(--muted); font-size: 12px; }
      main { padding: 26px 0 52px; display: grid; gap: 24px; }
      section { border-top: 1px solid var(--line); padding-top: 22px; }
      h2 { margin: 0 0 6px; font-size: 21px; }
      p { margin: 0 0 8px; color: var(--muted); }
      .action { display: grid; grid-template-columns: 58px minmax(0, 1fr) minmax(260px, .62fr); gap: 16px; align-items: start; border-top: 1px solid var(--line); padding: 18px 0; }
      .priority { width: 44px; height: 44px; border-radius: 999px; display: inline-grid; place-items: center; background: var(--ink); color: var(--paper); font-weight: 800; }
      a { color: var(--accent); font-weight: 750; overflow-wrap: anywhere; }
      code { display: block; border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: var(--soft); overflow-x: auto; white-space: nowrap; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .risks { display: grid; gap: 8px; margin: 10px 0 0; padding: 0; list-style: none; }
      .risks li { border-left: 4px solid var(--bad); background: #fff; padding: 10px 12px; color: var(--muted); }
      @media (max-width: 900px) { .metrics { grid-template-columns: repeat(2, minmax(120px, 1fr)); } .action { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <header>
      <div class="shell">
        <h1>Leadgen daily operator</h1>
        <p class="sub">One daily control layer for the 20 qualified seller lead sprint and the EUR 5,000/month path.</p>
        <div class="metrics">
${metric("ready to send", manual.ready_to_send)}
          ${metric("contacted", manual.contacted)}
          ${metric("qualified / 20", `${manual.qualified + manual.sent_to_jakub}/20`)}
          ${metric("preflight send ok", `${manual.live_preflight.send_ok}/${manual.ready_to_send}`)}
          ${metric("paid spend", formatMoney(paid.spend_eur))}
        </div>
      </div>
    </header>
    <main class="shell">
      <section>
        <h2>Next actions</h2>
        ${actionHtml}
      </section>
      <section>
        <h2>Today's execution block</h2>
        ${executionHtml}
      </section>
      <section>
        <h2>Commercial frame</h2>
        <p>Adam share formula is sale price * 1.375%. A EUR 200k closing is about ${formatMoney(commercial.revenue_at_200k_eur)}; a EUR 365k closing is about ${formatMoney(commercial.revenue_at_365k_eur)}.</p>
        <p>Base model for 20 qualified leads: ${escapeHtml(commercial.base_sends_for_20_qualified)} sends over ${escapeHtml(commercial.base_working_days_for_20_qualified)} working days at 20 sends/day.</p>
      </section>
      <section>
        <h2>Risk flags</h2>
        <ul class="risks">${riskFlags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>
      </section>
    </main>
  </body>
</html>
`;

writeFileSync(outputJson, `${JSON.stringify(state, null, 2)}\n`);
writeFileSync(outputMd, markdown);
writeFileSync(outputHtml, html);

console.log(
  JSON.stringify(
    {
      date: today,
      ready_to_send: manual.ready_to_send,
      contacted: manual.contacted,
      qualified_progress: `${manual.qualified + manual.sent_to_jakub}/20`,
      paid_rows: paid.rows,
      paid_spend_eur: paid.spend_eur,
      next_action: nextActions[0]?.title || null,
      markdown: outputMd,
      html: outputHtml,
      json: outputJson,
    },
    null,
    2,
  ),
);
