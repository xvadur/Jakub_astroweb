import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const markdownOutputPath = "ops/leads/manual-owner-hunting-followup-triage-2026-06-19.md";
const csvOutputPath = "ops/leads/manual-owner-hunting-followup-triage-2026-06-19.csv";
const htmlOutputPath = "ops/leads/manual-owner-hunting-followup-triage-2026-06-19.html";
const jsonOutputPath = "ops/leads/manual-owner-hunting-followup-triage-2026-06-19.json";

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

const escapeHtml = (value) =>
  String(value ?? "")
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

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const candidatesByUrl = new Map(candidates.map((row) => [row.source_url, row]));
const readyRows = logRows.filter((row) => row.status === "ready_to_send");
const contactedRows = logRows.filter((row) => row.status === "contacted");
const queueSource = contactedRows.length ? "contacted" : "ready_to_send_preview";
const sourceRows = contactedRows.length ? contactedRows : readyRows;

const errors = [];

if (!sourceRows.length) {
  errors.push("Expected at least one contacted or ready_to_send row for follow-up export.");
}

if (!contactedRows.length && readyRows.length !== 10) {
  errors.push(`Preview mode expects exactly 10 ready_to_send rows, found ${readyRows.length}.`);
}

const queue = sourceRows.map((row) => {
  const candidate = candidatesByUrl.get(row.source_url);
  const candidateId = candidate?.candidate_id || "";

  if (!candidate) {
    errors.push(`No candidate row for ready URL: ${row.source_url}`);
  }

  const followupMessage = `Dobrý deň, len krátko sa vraciam k ponuke v ${row.location}. Ak audit nechcete riešiť, v poriadku. Ak áno, pošlem tri konkrétne postrehy a môžete sa podľa toho rozhodnúť.`;
  const auditAcceptedCommand = `npm run leads:manual-status -- ${candidateId} replied --notes="owner accepted audit; audit observations sent"`;
  const callPermissionCommand = `npm run leads:manual-status -- ${candidateId} qualified --jakub-notified=yes --notes="owner gave call permission"`;
  const sentToJakubCommand = `npm run leads:manual-status -- ${candidateId} sent_to_jakub --jakub-notified=yes --notes="qualified owner lead handed to Jakub"`;
  const noInterestCommand = `npm run leads:manual-status -- ${candidateId} do_not_contact --notes="owner declined outreach"`;
  const followupCommand = `npm run leads:manual-status -- ${candidateId} contacted --follow-up=2026-06-24 --notes="single follow-up sent manually via ${row.source}"`;
  const followupDue = row.status === "contacted" && row.next_follow_up_at && row.next_follow_up_at <= today;

  return {
    candidate_id: candidateId,
    source: row.source,
    source_status: row.status,
    next_follow_up_at: row.next_follow_up_at || "",
    followup_due: followupDue,
    source_url: row.source_url,
    listing_title: row.listing_title,
    location: row.location,
    asking_price: row.asking_price,
    followup_message: followupMessage,
    followup_command: followupCommand,
    audit_accepted_command: auditAcceptedCommand,
    call_permission_command: callPermissionCommand,
    sent_to_jakub_command: sentToJakubCommand,
    no_interest_command: noInterestCommand,
  };
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const markdown = `# Manual owner hunting follow-up and reply triage

Date: 2026-06-19

Purpose: after the first 10 messages are sent, use this file to handle no-reply follow-ups and owner replies without inventing next steps.

Mode: ${queueSource}

Rules:

- Follow up max once, after 48-72 hours.
- If mode is \`ready_to_send_preview\`, send first messages before using follow-up commands.
- Stop after no / not interested / do not contact.
- Mark \`replied\` only after the owner accepts the audit or meaningfully engages.
- Mark \`qualified\` only after phone/call permission, valuation request, or permission for Jakub to continue.
- Mark \`sent_to_jakub\` only after the qualified lead is actually handed to Jakub.

## Reply Triage

\`\`\`text
Owner says yes / send the observations:
1. Send the candidate's audit reply from send queue.
2. Run audit_accepted_command.

Owner gives phone / asks for valuation / asks Jakub to call:
1. Prepare Jakub handoff.
2. Run call_permission_command.
3. Send to Jakub.
4. Run sent_to_jakub_command.

Owner says no / stop / not interested:
1. Do not argue.
2. Run no_interest_command.

No reply after 48-72h:
1. Send one follow-up message.
2. Run followup_command.
3. Do not follow up again unless they reply.
\`\`\`

${queue
  .map(
    (row, index) => `## ${index + 1}. ${row.candidate_id} - ${row.location}

- Source: ${row.source}
- Current status: ${row.source_status}
- Listing: ${row.source_url}
- Title: ${row.listing_title}
- Asking price: ${row.asking_price}

Follow-up message:

\`\`\`text
${row.followup_message}
\`\`\`

Commands:

\`\`\`bash
${row.followup_command}
${row.audit_accepted_command}
${row.call_permission_command}
${row.sent_to_jakub_command}
${row.no_interest_command}
\`\`\`
`,
  )
  .join("\n")}
`;

const csvRows = [
  [
    "order",
    "candidate_id",
    "source_status",
    "source",
    "source_url",
    "listing_title",
    "location",
    "asking_price",
    "followup_message",
    "followup_command",
    "audit_accepted_command",
    "call_permission_command",
    "sent_to_jakub_command",
    "no_interest_command",
  ],
  ...queue.map((row, index) => [
    index + 1,
    row.candidate_id,
    row.source_status,
    row.source,
    row.source_url,
    row.listing_title,
    row.location,
    row.asking_price,
    row.followup_message,
    row.followup_command,
    row.audit_accepted_command,
    row.call_permission_command,
    row.sent_to_jakub_command,
    row.no_interest_command,
  ]),
];

writeFileSync(markdownOutputPath, markdown);
writeFileSync(csvOutputPath, stringifyCsv(csvRows));

const state = {
  date: today,
  mode: queueSource,
  queue_count: queue.length,
  contacted_count: contactedRows.length,
  ready_preview_count: readyRows.length,
  followup_due_count: queue.filter((row) => row.followup_due).length,
  outputs: {
    markdown: markdownOutputPath,
    csv: csvOutputPath,
    html: htmlOutputPath,
    json: jsonOutputPath,
  },
  queue,
};

const cardsHtml = queue
  .map(
    (row) => `<article class="card ${row.followup_due ? "is-due" : ""}">
      <div>
        <div class="eyebrow">${escapeHtml(row.candidate_id)} · ${escapeHtml(row.source_status)}</div>
        <h2>${escapeHtml(row.location)}</h2>
        <p>${escapeHtml(row.listing_title)}</p>
        <a href="${escapeHtml(row.source_url)}">${escapeHtml(row.source)}</a>
        <div class="chips">
          <span>${escapeHtml(row.asking_price)}</span>
          <span>${row.followup_due ? "follow-up due" : queueSource === "ready_to_send_preview" ? "preview" : "not due"}</span>
          ${row.next_follow_up_at ? `<span>${escapeHtml(row.next_follow_up_at)}</span>` : ""}
        </div>
      </div>
      <div class="tools">
        <label>Follow-up message</label>
        <textarea readonly>${escapeHtml(row.followup_message)}</textarea>
        <button type="button" data-copy="${escapeHtml(row.followup_message)}">Copy follow-up</button>
        <label>Commands</label>
        <code>${escapeHtml(
          [
            row.followup_command,
            row.audit_accepted_command,
            row.call_permission_command,
            row.sent_to_jakub_command,
            row.no_interest_command,
          ].join("\n"),
        )}</code>
      </div>
    </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Follow-up triage</title>
    <style>
      :root { --paper:#fffaf2; --ink:#171411; --muted:#696159; --line:#ded8cf; --soft:#f2ece3; --accent:#8b4e2d; --due:#1f6b4f; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
      header { padding: 28px 0 18px; border-bottom: 1px solid var(--line); }
      h1 { margin: 0; font-size: clamp(30px, 5vw, 54px); line-height: .96; letter-spacing: 0; }
      .sub { margin: 10px 0 0; color: var(--muted); max-width: 740px; }
      .stats, .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .stats { margin-top: 18px; }
      .stats span, .chips span { border: 1px solid var(--line); border-radius: 999px; background: #fff; padding: 6px 10px; font-size: 12px; font-weight: 750; }
      main { display: grid; gap: 18px; padding: 22px 0 52px; }
      .card { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.25fr); gap: 22px; border-top: 1px solid var(--line); padding-top: 20px; }
      .card.is-due { border-top-color: var(--due); }
      .eyebrow { color: var(--accent); font-weight: 850; }
      h2 { margin: 2px 0 6px; font-size: 23px; }
      p { margin: 0 0 8px; color: var(--muted); }
      a { color: var(--accent); font-weight: 750; overflow-wrap: anywhere; }
      .chips { margin-top: 12px; }
      .tools { display: grid; gap: 8px; }
      label { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
      textarea { width: 100%; min-height: 112px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); padding: 12px; font: 14px/1.45 ui-sans-serif, system-ui, sans-serif; }
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
        <h1>Follow-up triage</h1>
        <p class="sub">One controlled follow-up after 48-72 hours, plus status commands for audit accepted, call permission, handoff, or stop.</p>
        <div class="stats">
          <span>${escapeHtml(queueSource)}</span>
          <span>${queue.length} rows</span>
          <span>${state.followup_due_count} due</span>
          <span>${contactedRows.length} contacted</span>
        </div>
      </div>
    </header>
    <main class="shell">${cardsHtml}</main>
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

writeFileSync(jsonOutputPath, `${JSON.stringify(state, null, 2)}\n`);
writeFileSync(htmlOutputPath, html);

console.log(
  JSON.stringify(
    {
      queue_count: queue.length,
      mode: queueSource,
      followup_due_count: state.followup_due_count,
      markdown: markdownOutputPath,
      csv: csvOutputPath,
      html: htmlOutputPath,
      json: jsonOutputPath,
    },
    null,
    2,
  ),
);
