import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const expansionCandidatesPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const outputPath = "ops/leads/manual-owner-hunting-cockpit-2026-06-19.html";
const messageDraftPaths = [
  "ops/leads/manual-owner-hunting-first-batch-2026-06-19.md",
  "ops/leads/manual-owner-hunting-next-seven-2026-06-19.md",
  "ops/leads/manual-owner-hunting-reserve-ten-2026-06-19.md",
];
const replyAuditPath = "ops/leads/manual-owner-hunting-reply-audits-2026-06-19.md";
const expansionMessagePath = "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md";

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

const readDraftMessages = (paths, blockIndex = 0) => {
  const messages = new Map();

  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    const sections = text.split(/\n##\s+/).slice(1);

    for (const section of sections) {
      const id = section.match(/\bHUNT-\d{3}\b/)?.[0];
      const blocks = [...section.matchAll(/```text\n([\s\S]*?)\n```/g)];
      const message = blocks[blockIndex]?.[1]?.trim();
      if (id && message && !messages.has(id)) {
        messages.set(id, { message, path });
      }
    }
  }

  return messages;
};

const candidates = readTable(candidatesPath)
  .filter((row) => row.candidate_id)
  .map((row) => ({ ...row, source_pool: "main" }));
const expansionCandidates = readTable(expansionCandidatesPath)
  .filter((row) => row.candidate_id)
  .map((row) => ({ ...row, source_pool: "expansion" }));
const logRows = readTable(logPath).filter((row) => row.source_url && row.status && !row.status.includes("|"));
const messages = new Map([
  ...readDraftMessages(messageDraftPaths).entries(),
  ...readDraftMessages([expansionMessagePath]).entries(),
]);
const replyAudits = new Map([
  ...readDraftMessages([replyAuditPath]).entries(),
  ...readDraftMessages([expansionMessagePath], 1).entries(),
]);
const logByUrl = new Map(logRows.map((row) => [row.source_url, row]));

const classifyStage = (candidate, pipelineStatus) => {
  if (candidate.source_pool === "expansion") return "expansion";
  if (pipelineStatus === "ready_to_send") return "active";
  if (["contacted", "replied", "qualified", "sent_to_jakub"].includes(pipelineStatus)) return "in_progress";
  if (pipelineStatus === "not_fit" || pipelineStatus === "do_not_contact") return "closed";
  if ((candidate.notes || "").toLowerCase().includes("reserve live verified")) return "verified_reserve";
  return "main_draft";
};

const rows = [...candidates, ...expansionCandidates].map((candidate) => {
  const log = logByUrl.get(candidate.source_url) || {};
  const draft = messages.get(candidate.candidate_id);
  const replyAudit = replyAudits.get(candidate.candidate_id);
  const pipelineStatus = log.status || "draft_only";
  return {
    ...candidate,
    pipeline_status: pipelineStatus,
    cockpit_stage: classifyStage(candidate, pipelineStatus),
    next_follow_up_at: log.next_follow_up_at || "",
    outreach_message_version: log.outreach_message_version || "",
    draft_path: draft?.path || "",
    message: draft?.message || "",
    reply_audit_path: replyAudit?.path || "",
    reply_audit: replyAudit?.message || "",
  };
});

const counts = rows.reduce(
  (acc, row) => {
    acc.total += 1;
    acc[row.pipeline_status] = (acc[row.pipeline_status] || 0) + 1;
    acc[row.cockpit_stage] = (acc[row.cockpit_stage] || 0) + 1;
    if (row.message) acc.withDraft += 1;
    if (row.reply_audit) acc.withReplyAudit += 1;
    if (row.ai_grade === "A" || row.ai_grade === "B") acc.ab += 1;
    return acc;
  },
  { total: 0, withDraft: 0, withReplyAudit: 0, ab: 0 },
);

const sortOrder = {
  active: 0,
  in_progress: 1,
  verified_reserve: 2,
  expansion: 3,
  main_draft: 4,
  closed: 9,
};
rows.sort((a, b) => (sortOrder[a.cockpit_stage] ?? 8) - (sortOrder[b.cockpit_stage] ?? 8) || a.candidate_id.localeCompare(b.candidate_id));

const rowHtml = rows
  .map((row) => {
    const isReady = row.pipeline_status === "ready_to_send";
    const needsCheck = row.pipeline_status === "draft_only";
    const followUp = row.next_follow_up_at || "2026-06-22";
    const isExpansion = row.source_pool === "expansion";
    const statusCommand = isExpansion
      ? `npm run leads:manual-import-expansion -- ${row.candidate_id} ready_to_send --follow-up=2026-06-24 --notes="imported from expansion after live pre-send check"`
      : `npm run leads:manual-status -- ${row.candidate_id} contacted --follow-up=${followUp} --notes="sent manually via ${row.source}"`;
    const repliedCommand = isExpansion
      ? `npm run leads:manual-status -- ${row.candidate_id} replied --notes="owner accepted audit; audit observations sent"`
      : `npm run leads:manual-status -- ${row.candidate_id} replied --notes="owner accepted audit; audit observations sent"`;
    return `
      <article class="lead-row ${isReady ? "is-ready" : ""}" data-status="${escapeHtml(row.pipeline_status)}" data-grade="${escapeHtml(row.ai_grade)}" data-stage="${escapeHtml(row.cockpit_stage)}">
        <div class="lead-main">
          <div class="lead-topline">
            <strong>${escapeHtml(row.candidate_id)}</strong>
            <span>${escapeHtml(row.ai_grade)}</span>
            <span>${escapeHtml(row.cockpit_stage)}</span>
            <span>${escapeHtml(row.pipeline_status)}</span>
            <span>${escapeHtml(row.source)}</span>
          </div>
          <h2>${escapeHtml(row.listing_title)}</h2>
          <p>${escapeHtml(row.location)} · ${escapeHtml(row.property_type)} · ${escapeHtml(row.asking_price)}</p>
          <p class="reason">${escapeHtml(row.reason_for_grade)}</p>
          <ul>
            <li>${escapeHtml(row.first_observation)}</li>
            <li>${escapeHtml(row.second_observation)}</li>
            <li>${escapeHtml(row.third_observation)}</li>
          </ul>
        </div>
        <div class="lead-actions">
          <a class="button secondary" href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">Otvoriť inzerát</a>
          <button class="button primary" type="button" data-copy="${escapeHtml(row.candidate_id)}" ${row.message ? "" : "disabled"}>
            Kopírovať správu
          </button>
          <textarea id="message-${escapeHtml(row.candidate_id)}" readonly>${escapeHtml(row.message || "Chýba draft správy.")}</textarea>
          <button class="button secondary" type="button" data-copy-reply="${escapeHtml(row.candidate_id)}" ${row.reply_audit ? "" : "disabled"}>
            Kopírovať audit odpoveď
          </button>
          <textarea class="reply-audit" id="reply-${escapeHtml(row.candidate_id)}" readonly>${escapeHtml(row.reply_audit || "Audit odpoveď zatiaľ nie je pripravená.")}</textarea>
          <button class="button secondary" type="button" data-copy-command="${escapeHtml(row.candidate_id)}">
            Kopírovať status príkaz
          </button>
          <code class="command" id="command-${escapeHtml(row.candidate_id)}">${escapeHtml(statusCommand)}</code>
          <button class="button secondary" type="button" data-copy-replied-command="${escapeHtml(row.candidate_id)}" ${row.reply_audit ? "" : "disabled"}>
            Kopírovať replied príkaz
          </button>
          <code class="command" id="replied-command-${escapeHtml(row.candidate_id)}">${escapeHtml(repliedCommand)}</code>
          <p>${isExpansion ? "Expansion: najprv live-check, potom import do main poolu. Až potom odosielať." : needsCheck ? "Najprv overiť detail a aktivitu inzerátu." : "Po odoslaní zmeň status v CSV na contacted."}</p>
        </div>
      </article>
    `;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Manual owner hunting cockpit</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #151515;
        --muted: #66615a;
        --line: #ded8cf;
        --paper: #fffaf2;
        --soft: #f1ebe2;
        --accent: #8b4e2d;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      header {
        position: sticky;
        top: 0;
        z-index: 5;
        border-bottom: 1px solid var(--line);
        background: rgba(255, 250, 242, 0.94);
        backdrop-filter: blur(12px);
      }
      .shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
      .header-inner {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 18px;
        align-items: center;
        padding: 18px 0;
      }
      h1 { margin: 0 0 4px; font-size: clamp(24px, 3vw, 36px); line-height: 1.05; }
      header p { margin: 0; color: var(--muted); }
      .stats {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }
      .stat {
        min-width: 82px;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px 10px;
        background: #fff;
        text-align: right;
      }
      .stat strong { display: block; font-size: 20px; line-height: 1; }
      .stat span { display: block; color: var(--muted); font-size: 12px; }
      main { padding: 24px 0 48px; }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }
      .ops-note {
        display: grid;
        gap: 6px;
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        padding: 12px 0;
        margin-bottom: 16px;
        color: var(--muted);
      }
      .ops-note a { color: var(--ink); font-weight: 700; }
      .filter {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 8px 12px;
        background: #fff;
        color: var(--ink);
        cursor: pointer;
      }
      .filter.is-active {
        border-color: var(--ink);
        background: var(--ink);
        color: var(--paper);
      }
      .lead-list { display: grid; gap: 14px; }
      .lead-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 0.75fr);
        gap: 18px;
        border-top: 1px solid var(--line);
        padding: 18px 0;
      }
      .lead-row.is-ready { border-top-color: #a56b42; }
      .lead-topline {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
      }
      .lead-topline span,
      .lead-topline strong {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 4px 8px;
        background: #fff;
        font-size: 12px;
      }
      h2 { margin: 0 0 6px; font-size: 20px; line-height: 1.2; }
      .lead-main p { margin: 0 0 8px; color: var(--muted); }
      .reason { color: var(--ink) !important; }
      ul { margin: 10px 0 0; padding-left: 18px; color: var(--muted); }
      .lead-actions { display: grid; gap: 10px; align-content: start; }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        border-radius: 7px;
        padding: 0 14px;
        font-weight: 750;
        text-decoration: none;
        cursor: pointer;
      }
      .button.primary { border: 1px solid var(--ink); background: var(--ink); color: var(--paper); }
      .button.secondary { border: 1px solid var(--line); background: #fff; color: var(--ink); }
      .button:disabled { opacity: 0.45; cursor: not-allowed; }
      textarea {
        width: 100%;
        min-height: 190px;
        resize: vertical;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px;
        background: #fff;
        color: var(--ink);
        font: 14px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .reply-audit { min-height: 230px; }
      .command {
        display: block;
        overflow-x: auto;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 10px;
        background: var(--soft);
        color: var(--ink);
        font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        white-space: nowrap;
      }
      .lead-actions p { margin: 0; color: var(--muted); font-size: 13px; }
      .toast {
        position: fixed;
        right: 18px;
        bottom: 18px;
        border-radius: 8px;
        padding: 12px 14px;
        background: var(--ink);
        color: var(--paper);
        opacity: 0;
        transform: translateY(8px);
        transition: 160ms ease;
      }
      .toast.is-visible { opacity: 1; transform: translateY(0); }
      @media (max-width: 820px) {
        .header-inner, .lead-row { grid-template-columns: 1fr; }
        .stats { justify-content: flex-start; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="shell header-inner">
        <div>
          <h1>Manual owner hunting cockpit</h1>
          <p>Run live preflight, open listing, copy message, send manually, then update the CSV status.</p>
        </div>
        <div class="stats" aria-label="Pipeline summary">
          <div class="stat"><strong>${counts.total}</strong><span>candidates</span></div>
          <div class="stat"><strong>${counts.ready_to_send || 0}</strong><span>ready</span></div>
          <div class="stat"><strong>${counts.verified_reserve || 0}</strong><span>reserve</span></div>
          <div class="stat"><strong>${counts.expansion || 0}</strong><span>expansion</span></div>
          <div class="stat"><strong>${counts.withDraft}</strong><span>drafts</span></div>
          <div class="stat"><strong>${counts.withReplyAudit}</strong><span>audits</span></div>
        </div>
      </div>
    </header>
    <main class="shell">
      <section class="ops-note" aria-label="Pre-send gate">
        <div>Pre-send gate: <code>npm run leads:manual-live-preflight</code></div>
        <div>Output: <a href="manual-owner-hunting-live-preflight-2026-06-19.md">manual-owner-hunting-live-preflight-2026-06-19.md</a></div>
      </section>
      <div class="toolbar" aria-label="Filters">
        <button class="filter is-active" type="button" data-filter="all">Všetko</button>
        <button class="filter" type="button" data-filter="active">Active queue</button>
        <button class="filter" type="button" data-filter="verified_reserve">Verified reserve</button>
        <button class="filter" type="button" data-filter="expansion">Expansion</button>
        <button class="filter" type="button" data-filter="closed">Closed / not fit</button>
        <button class="filter" type="button" data-filter="A">Grade A</button>
        <button class="filter" type="button" data-filter="B">Grade B</button>
      </div>
      <section class="lead-list">
        ${rowHtml}
      </section>
    </main>
    <div class="toast" data-toast>Skopírované</div>
    <script>
      const toast = document.querySelector("[data-toast]");
      const showToast = (text) => {
        if (!toast) return;
        toast.textContent = text;
        toast.classList.add("is-visible");
        window.setTimeout(() => toast.classList.remove("is-visible"), 1400);
      };

      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const copyButton = target.closest("[data-copy]");
        if (copyButton instanceof HTMLElement) {
          const id = copyButton.dataset.copy;
          const textarea = document.getElementById("message-" + id);
          if (textarea instanceof HTMLTextAreaElement) {
            textarea.select();
            try {
              await navigator.clipboard.writeText(textarea.value);
              showToast("Skopírované " + id);
            } catch {
              document.execCommand("copy");
              showToast("Skopírované " + id);
            }
          }
        }

        const copyReplyButton = target.closest("[data-copy-reply]");
        if (copyReplyButton instanceof HTMLElement) {
          const id = copyReplyButton.dataset.copyReply;
          const textarea = document.getElementById("reply-" + id);
          if (textarea instanceof HTMLTextAreaElement) {
            textarea.select();
            try {
              await navigator.clipboard.writeText(textarea.value);
              showToast("Skopírovaná audit odpoveď " + id);
            } catch {
              document.execCommand("copy");
              showToast("Skopírovaná audit odpoveď " + id);
            }
          }
        }

        const copyCommandButton = target.closest("[data-copy-command]");
        if (copyCommandButton instanceof HTMLElement) {
          const id = copyCommandButton.dataset.copyCommand;
          const command = document.getElementById("command-" + id);
          const text = command?.textContent || "";
          if (text) {
            try {
              await navigator.clipboard.writeText(text);
              showToast("Skopírovaný status príkaz " + id);
            } catch {
              showToast("Skopíruj status príkaz ručne");
            }
          }
        }

        const copyRepliedCommandButton = target.closest("[data-copy-replied-command]");
        if (copyRepliedCommandButton instanceof HTMLElement) {
          const id = copyRepliedCommandButton.dataset.copyRepliedCommand;
          const command = document.getElementById("replied-command-" + id);
          const text = command?.textContent || "";
          if (text) {
            try {
              await navigator.clipboard.writeText(text);
              showToast("Skopírovaný replied príkaz " + id);
            } catch {
              showToast("Skopíruj replied príkaz ručne");
            }
          }
        }

        const filter = target.closest("[data-filter]");
        if (filter instanceof HTMLElement) {
          const value = filter.dataset.filter || "all";
          document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === filter));
          document.querySelectorAll(".lead-row").forEach((row) => {
            const visible =
              value === "all" ||
              row.dataset.status === value ||
              row.dataset.stage === value ||
              row.dataset.grade === value;
            row.hidden = !visible;
          });
        }
      });
    </script>
  </body>
</html>
`;

writeFileSync(outputPath, html);
console.log(outputPath);
