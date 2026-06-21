import { existsSync, readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const replyAuditsPath = "ops/leads/manual-owner-hunting-reply-audits-2026-06-19.md";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const outputMarkdownPath = `ops/leads/manual-owner-hunting-audit-reply-pack-${today}.md`;
const outputHtmlPath = `ops/leads/manual-owner-hunting-audit-reply-pack-${today}.html`;
const outputJsonPath = `ops/leads/manual-owner-hunting-audit-reply-pack-${today}.json`;

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

const parseReplyAudits = (text) => {
  const audits = new Map();
  const sectionRegex = /^## (HUNT-\d{3})\s*\n\n```text\n([\s\S]*?)\n```/gm;
  let match = sectionRegex.exec(text);

  while (match) {
    audits.set(match[1], match[2].trim());
    match = sectionRegex.exec(text);
  }

  const callPermissionAsk = text.match(/## Ask for call permission[\s\S]*?```text\n([\s\S]*?)\n```/)?.[1]?.trim() || "";

  return { audits, callPermissionAsk };
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const statusCounts = (rows) =>
  rows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});

if (!existsSync(replyAuditsPath)) {
  console.error(`Missing reply audits file: ${replyAuditsPath}`);
  process.exit(1);
}

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const candidatesByUrl = new Map(candidates.map((row) => [row.source_url, row]));
const { audits, callPermissionAsk } = parseReplyAudits(readFileSync(replyAuditsPath, "utf8"));
const contactedRows = logRows.filter((row) => ["contacted", "replied", "qualified"].includes(row.status));
const readyRows = logRows.filter((row) => row.status === "ready_to_send");
const selectedRows = contactedRows.length ? contactedRows : readyRows;
const mode = contactedRows.length ? "contacted_or_active_replies" : "ready_to_send_preview";
const errors = [];
const warnings = [];

if (!callPermissionAsk) {
  errors.push("Missing shared call-permission ask in reply audits file.");
}

const rows = selectedRows.map((logRow) => {
  const candidate = candidatesByUrl.get(logRow.source_url);
  const candidateId = candidate?.candidate_id || "";
  const auditReply = audits.get(candidateId) || "";

  if (!candidateId) {
    errors.push(`Cannot map log row to candidate id: ${logRow.source_url}`);
  }

  if (!auditReply) {
    errors.push(`${candidateId || logRow.source_url}: missing audit reply draft.`);
  }

  if (logRow.status === "ready_to_send") {
    warnings.push(`${candidateId}: still ready_to_send; use this pack only after the owner asks for observations.`);
  }

  return {
    candidate_id: candidateId,
    status: logRow.status,
    source: logRow.source,
    source_url: logRow.source_url,
    listing_title: logRow.listing_title,
    location: logRow.location,
    asking_price: logRow.asking_price,
    ai_grade: logRow.ai_grade,
    audit_reply: auditReply,
    call_permission_ask: callPermissionAsk,
    replied_command: `npm run leads:manual-status -- ${candidateId} replied --notes="owner accepted audit; audit observations sent"`,
    qualified_command: `npm run leads:manual-status -- ${candidateId} qualified --jakub-notified=yes --notes="owner gave call permission"`,
    reply_report_audit_line: `${candidateId} | audit | owner asked for the 3 observations`,
    reply_report_qualified_line: `${candidateId} | qualified | owner asked for valuation/call; private details kept outside repo`,
  };
});

if (!selectedRows.length) {
  errors.push("No contacted/replied/qualified or ready_to_send rows available for audit reply pack.");
}

const counts = statusCounts(logRows);
const state = {
  ok: errors.length === 0,
  date: today,
  mode,
  counts,
  rows: rows.length,
  errors,
  warnings,
  outputs: {
    markdown: outputMarkdownPath,
    html: outputHtmlPath,
    json: outputJsonPath,
  },
};

const markdown = `# Manual owner hunting audit reply pack

Date: ${today}

Purpose: copy-ready second-step audit messages for owners who ask for the promised 3 observations. This is the bridge from \`contacted\` to \`replied\` and then to \`qualified\`.

## Status

\`\`\`json
${JSON.stringify(
  {
    ok: state.ok,
    mode,
    rows: rows.length,
    counts,
    errors,
    warning_count: warnings.length,
  },
  null,
  2,
)}
\`\`\`

## Rules

- Send the audit reply only after the owner asks for the observations or clearly says yes.
- After sending the audit reply, mark the row as \`replied\`.
- Ask for call permission only after the owner reacts positively to the audit or asks for the next step.
- Do not paste private phone/email details into repo files.

## Shared Call-Permission Ask

\`\`\`text
${callPermissionAsk}
\`\`\`

## Rows

${rows
  .map(
    (row) => `### ${row.candidate_id} - ${row.location}

- Status: ${row.status}
- Source: ${row.source}
- Listing: ${row.source_url}
- Price: ${row.asking_price}
- Grade: ${row.ai_grade}

Audit reply:

\`\`\`text
${row.audit_reply}
\`\`\`

Call-permission ask:

\`\`\`text
${row.call_permission_ask}
\`\`\`

Status commands:

\`\`\`bash
${row.replied_command}
${row.qualified_command}
\`\`\`

Reply-report lines:

\`\`\`text
${row.reply_report_audit_line}
${row.reply_report_qualified_line}
\`\`\`
`,
  )
  .join("\n")}

## Warnings

${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- none"}
`;

const cardsHtml = rows
  .map(
    (row) => `<article class="card">
      <div class="meta">
        <div class="id">${escapeHtml(row.candidate_id)}</div>
        <h2>${escapeHtml(row.location)}</h2>
        <p>${escapeHtml(row.listing_title)}</p>
        <a href="${escapeHtml(row.source_url)}">${escapeHtml(row.source)}</a>
        <div class="chips">
          <span>${escapeHtml(row.status)}</span>
          <span>${escapeHtml(row.asking_price)}</span>
          <span>Grade ${escapeHtml(row.ai_grade)}</span>
        </div>
      </div>
      <div class="copy">
        <label>Audit reply</label>
        <textarea readonly>${escapeHtml(row.audit_reply)}</textarea>
        <button type="button" data-copy="${escapeHtml(row.audit_reply)}">Copy audit</button>
        <label>Call-permission ask</label>
        <textarea readonly>${escapeHtml(row.call_permission_ask)}</textarea>
        <button type="button" data-copy="${escapeHtml(row.call_permission_ask)}">Copy ask</button>
        <label>Status commands</label>
        <code>${escapeHtml(`${row.replied_command}\n${row.qualified_command}`)}</code>
      </div>
    </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Audit reply pack</title>
    <style>
      :root { --paper:#fffaf2; --ink:#171411; --muted:#696159; --line:#ded8cf; --soft:#f2ece3; --accent:#8b4e2d; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
      header { padding: 28px 0 18px; border-bottom: 1px solid var(--line); }
      h1 { margin: 0; font-size: clamp(30px, 5vw, 54px); line-height: .96; letter-spacing: 0; }
      .sub { margin: 10px 0 0; max-width: 760px; color: var(--muted); }
      .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
      .stats span, .chips span { border: 1px solid var(--line); border-radius: 999px; background: #fff; padding: 6px 10px; font-size: 12px; font-weight: 750; }
      main { display: grid; gap: 18px; padding: 22px 0 52px; }
      .card { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.25fr); gap: 22px; padding-top: 20px; border-top: 1px solid var(--line); }
      .id { color: var(--accent); font-weight: 850; }
      h2 { margin: 2px 0 6px; font-size: 23px; }
      p { margin: 0 0 8px; color: var(--muted); }
      a { color: var(--accent); font-weight: 750; overflow-wrap: anywhere; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
      .copy { display: grid; gap: 8px; }
      label { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
      textarea { width: 100%; min-height: 150px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); padding: 12px; font: 14px/1.45 ui-sans-serif, system-ui, sans-serif; }
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
        <h1>Audit reply pack</h1>
        <p class="sub">Copy-ready second-step messages for owners who ask for the promised 3 observations. Use only after a positive reply.</p>
        <div class="stats">
          <span>${escapeHtml(mode)}</span>
          <span>${rows.length} rows</span>
          <span>${counts.contacted || 0} contacted</span>
          <span>${counts.ready_to_send || 0} ready</span>
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

writeFileSync(outputJsonPath, `${JSON.stringify({ ...state, queue: rows }, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);
writeFileSync(outputHtmlPath, html);

console.log(
  JSON.stringify(
    {
      ok: state.ok,
      date: today,
      mode,
      rows: rows.length,
      warnings: warnings.length,
      errors,
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
