import { readFileSync, writeFileSync } from "node:fs";

const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const nextWavePath = "ops/leads/manual-owner-hunting-next-wave-2026-06-19.json";
const volumeScenariosPath = "ops/leads/leadgen-volume-scenarios-2026-06-19.csv";
const markdownOutputPath = "ops/leads/manual-owner-hunting-command-center-2026-06-19.md";
const htmlOutputPath = "ops/leads/manual-owner-hunting-command-center-2026-06-19.html";

const links = {
  sendSession: "ops/leads/manual-owner-hunting-send-session-2026-06-19.html",
  sendCloseout: "ops/leads/manual-owner-hunting-send-session-closeout-2026-06-19.md",
  nextWave: "ops/leads/manual-owner-hunting-next-wave-2026-06-19.html",
  replyIntake: "ops/leads/manual-owner-hunting-reply-intake-2026-06-19.md",
  followups: "ops/leads/manual-owner-hunting-followup-triage-2026-06-19.md",
  handoff: "ops/leads/jakub-qualified-lead-handoff-2026-06-19.md",
  volumeModel: "docs/LEADGEN_VOLUME_MODEL_2026-06-19.md",
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
  const headers = rows[0];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const logRows = readTable(logPath).filter((row) => row.source_url && row.status && !row.status.includes("|"));
const nextWave = JSON.parse(readFileSync(nextWavePath, "utf8"));
const volumeRows = readTable(volumeScenariosPath);
const baseScenario = volumeRows.find((row) => row.scenario === "base") || {};

const statusCounts = logRows.reduce((counts, row) => {
  counts[row.status] = (counts[row.status] || 0) + 1;
  return counts;
}, {});

const readyToSend = statusCounts.ready_to_send || 0;
const contacted = statusCounts.contacted || 0;
const replied = statusCounts.replied || 0;
const qualified = statusCounts.qualified || 0;
const sentToJakub = statusCounts.sent_to_jakub || 0;
const nextImportReady = nextWave.counts?.import_ready || 0;
const nextStop = nextWave.counts?.do_not_import || 0;
const sendCapacityToday = readyToSend + nextImportReady;
const targetDailySends = 20;
const dailyGap = Math.max(0, targetDailySends - sendCapacityToday);

const priority =
  readyToSend > 0
    ? "send_current_queue"
    : nextImportReady > 0
      ? "import_next_wave"
      : "source_more_candidates";

const actionCards = [
  {
    title: "1. Send current queue",
    status: readyToSend ? `${readyToSend} ready` : "empty",
    body: "Open the send session, send each platform message manually, then copy the session report.",
    href: links.sendSession,
    command: "",
  },
  {
    title: "2. Apply send closeout",
    status: "dry-run first",
    body: "Convert the copied session report into contacted/not_fit statuses. This is the gate from preparation to real outreach.",
    href: links.sendCloseout,
    command: `npm run leads:manual-apply-session-report -- --report="$tmpfile"`,
  },
  {
    title: "3. Import next wave",
    status: `${nextImportReady} import-ready`,
    body: nextStop
      ? `${nextStop} next-wave candidate is already stop/do_not_import after live preflight. Import only import_ready rows.`
      : "Next wave is clean after live preflight. Import only after the current queue is handled.",
    href: links.nextWave,
    command: "npm run leads:manual-next-wave",
  },
  {
    title: "4. Handle replies",
    status: `${replied + qualified + sentToJakub} active reply states`,
    body: "Use reply intake only after owners respond. Qualified means call/valuation/continuation permission, not just a sent message.",
    href: links.replyIntake,
    command: `npm run leads:manual-apply-reply-report -- --report="$tmpfile"`,
  },
  {
    title: "5. Handoff to Jakub",
    status: `${qualified + sentToJakub} handoff candidates`,
    body: "Export only real qualified or already-sent leads. Current count must stay zero until owners actually qualify.",
    href: links.handoff,
    command: "npm run leads:manual-handoff",
  },
];

const markdown = `# Manual owner hunting command center

Date: ${today}

Purpose: one daily operating view for the path from prepared outreach to qualified Jakub handoff.

## Current Truth

\`\`\`json
${JSON.stringify(
  {
    ready_to_send: readyToSend,
    contacted,
    replied,
    qualified,
    sent_to_jakub: sentToJakub,
    next_wave_import_ready: nextImportReady,
    next_wave_do_not_import: nextStop,
    immediate_send_capacity: sendCapacityToday,
    target_daily_sends: targetDailySends,
    daily_send_gap: dailyGap,
    priority,
  },
  null,
  2,
)}
\`\`\`

## Money Math

- Base model: ${baseScenario.sends_needed_for_20_qualified || "n/a"} sends for 20 qualified leads.
- Base cadence: ${baseScenario.sends_per_day || 20} sends/day.
- Base time: ${baseScenario.working_days_needed || "n/a"} working days.
- Today: ${sendCapacityToday}/${targetDailySends} immediate send capacity.

## Operating Order

${actionCards
  .map(
    (card) => `### ${card.title}

- Status: ${card.status}
- File: ${card.href}
- Action: ${card.body}
${card.command ? `- Command: \`${card.command}\`` : ""}
`,
  )
  .join("\n")}

## Do Not Fake

- Do not mark \`contacted\` until the message was actually sent.
- Do not mark \`replied\` until the owner meaningfully engages.
- Do not mark \`qualified\` until the owner gives call, valuation, or continuation permission.
- Do not mark \`sent_to_jakub\` until Jakub actually receives the qualified lead.
`;

const cardsHtml = actionCards
  .map(
    (card) => `<article class="action">
      <div>
        <h2>${escapeHtml(card.title)}</h2>
        <p class="status">${escapeHtml(card.status)}</p>
        <p>${escapeHtml(card.body)}</p>
      </div>
      <div class="tools">
        <a class="button primary" href="../../${escapeHtml(card.href)}">Open</a>
        ${card.command ? `<button class="button secondary" type="button" data-copy="${escapeHtml(card.title)}">Copy command</button><code id="${escapeHtml(card.title)}">${escapeHtml(card.command)}</code>` : ""}
      </div>
    </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Leadgen command center</title>
    <style>
      :root { --ink:#171411; --muted:#696159; --line:#ded8cf; --paper:#fffaf2; --soft:#f2ece3; --accent:#8b4e2d; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
      header { border-bottom: 1px solid var(--line); background: rgba(255,250,242,.94); position: sticky; top: 0; z-index: 2; backdrop-filter: blur(12px); }
      .header-inner { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: center; padding: 18px 0; }
      h1 { margin: 0; font-size: 32px; line-height: 1.05; }
      header p { margin: 5px 0 0; color: var(--muted); }
      .stats { display: grid; grid-template-columns: repeat(4, minmax(84px, 1fr)); gap: 8px; }
      .stat { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 9px 10px; text-align: right; }
      .stat strong { display: block; font-size: 22px; line-height: 1; }
      .stat span { color: var(--muted); font-size: 12px; }
      main { display: grid; gap: 18px; padding: 22px 0 46px; }
      .band { border-top: 1px solid var(--line); padding-top: 18px; }
      .action { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .55fr); gap: 18px; border-top: 1px solid var(--line); padding-top: 18px; }
      h2 { margin: 0 0 4px; font-size: 20px; }
      p { margin: 0 0 8px; color: var(--muted); }
      .status { color: var(--accent); font-weight: 750; }
      .tools { display: grid; gap: 10px; align-content: start; }
      .button { min-height: 40px; border-radius: 7px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; font-weight: 750; cursor: pointer; text-decoration: none; }
      .button.primary { border: 1px solid var(--ink); background: var(--ink); color: var(--paper); }
      .button.secondary { border: 1px solid var(--line); background: #fff; color: var(--ink); }
      code { display: block; overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: var(--soft); white-space: nowrap; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .warning { border-top: 1px solid var(--line); padding-top: 18px; }
      .warning ul { margin: 8px 0 0; padding-left: 20px; color: var(--muted); }
      .toast { position: fixed; right: 18px; bottom: 18px; border-radius: 8px; padding: 12px 14px; background: var(--ink); color: var(--paper); opacity: 0; transform: translateY(8px); transition: 160ms ease; }
      .toast.is-visible { opacity: 1; transform: translateY(0); }
      @media (max-width: 820px) { .header-inner, .action { grid-template-columns: 1fr; } .stats { grid-template-columns: repeat(2, minmax(84px, 1fr)); } .stat { text-align: left; } }
    </style>
  </head>
  <body>
    <header>
      <div class="shell header-inner">
        <div>
          <h1>Leadgen command center</h1>
          <p>Daily operating order from prepared outreach to qualified Jakub handoff.</p>
        </div>
        <div class="stats">
          <div class="stat"><strong>${readyToSend}</strong><span>ready</span></div>
          <div class="stat"><strong>${contacted}</strong><span>contacted</span></div>
          <div class="stat"><strong>${qualified}</strong><span>qualified</span></div>
          <div class="stat"><strong>${nextImportReady}</strong><span>next ready</span></div>
        </div>
      </div>
    </header>
    <main class="shell">
      <section class="band">
        <h2>Current bottleneck: ${escapeHtml(priority)}</h2>
        <p>Immediate send capacity is ${sendCapacityToday}/${targetDailySends}. Base model needs ${escapeHtml(baseScenario.sends_needed_for_20_qualified || "n/a")} sends for 20 qualified leads.</p>
      </section>
      ${cardsHtml}
      <section class="warning">
        <h2>Do Not Fake</h2>
        <ul>
          <li>Contacted only after an actual sent message.</li>
          <li>Replied only after meaningful owner engagement.</li>
          <li>Qualified only after call, valuation, or continuation permission.</li>
          <li>Sent to Jakub only after Jakub actually receives the lead.</li>
        </ul>
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
          window.setTimeout(() => toast.classList.remove("is-visible"), 1300);
        }
      };
      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const button = target.closest("[data-copy]");
        if (button instanceof HTMLElement) {
          copyText(document.getElementById(button.dataset.copy || "")?.textContent || "");
        }
      });
    </script>
  </body>
</html>
`;

writeFileSync(markdownOutputPath, markdown);
writeFileSync(htmlOutputPath, html);

console.log(
  JSON.stringify(
    {
      date: today,
      ready_to_send: readyToSend,
      contacted,
      replied,
      qualified,
      sent_to_jakub: sentToJakub,
      next_wave_import_ready: nextImportReady,
      next_wave_do_not_import: nextStop,
      immediate_send_capacity: sendCapacityToday,
      target_daily_sends: targetDailySends,
      daily_send_gap: dailyGap,
      priority,
      markdown: markdownOutputPath,
      html: htmlOutputPath,
    },
    null,
    2,
  ),
);
