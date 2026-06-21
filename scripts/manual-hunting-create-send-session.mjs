import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const preflightPath = "ops/leads/manual-owner-hunting-live-preflight-2026-06-19.json";
const markdownOutputPath = "ops/leads/manual-owner-hunting-send-session-2026-06-19.md";
const htmlOutputPath = "ops/leads/manual-owner-hunting-send-session-2026-06-19.html";
const packetCsvOutputPath = "ops/leads/manual-owner-hunting-send-packet-2026-06-19.csv";
const packetJsonOutputPath = "ops/leads/manual-owner-hunting-send-packet-2026-06-19.json";
const sessionReportTemplateOutputPath = "ops/leads/manual-owner-hunting-session-report-template-2026-06-19.txt";
const messagePaths = [
  "ops/leads/manual-owner-hunting-first-batch-2026-06-19.md",
  "ops/leads/manual-owner-hunting-next-seven-2026-06-19.md",
  "ops/leads/manual-owner-hunting-reserve-ten-2026-06-19.md",
  "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md",
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

const readTable = (path) => {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
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

const readMessages = (paths) => {
  const messages = new Map();

  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    const sections = text.split(/\n##\s+/).slice(1);

    for (const section of sections) {
      const id = section.match(/\bHUNT-\d{3}\b/)?.[0];
      const message = section.match(/```text\n([\s\S]*?)\n```/)?.[1]?.trim();
      if (id && message && !messages.has(id)) {
        messages.set(id, message);
      }
    }
  }

  return messages;
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

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const candidatesByUrl = new Map(candidates.map((row) => [row.source_url, row]));
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const messages = readMessages(messagePaths);
const preflight = JSON.parse(readFileSync(preflightPath, "utf8"));
const preflightById = new Map(preflight.results.map((row) => [row.candidate_id, row]));
const readyRows = logRows.filter((row) => row.status === "ready_to_send");

const errors = [];

if (readyRows.length !== 10) {
  errors.push(`Expected 10 ready_to_send rows, found ${readyRows.length}.`);
}

const queue = readyRows.map((row, index) => {
  const candidate = candidatesByUrl.get(row.source_url);
  const candidateId = candidate?.candidate_id || "";
  const preflightRow = preflightById.get(candidateId);
  const message = messages.get(candidateId) || "";

  if (!candidate) errors.push(`Missing candidate for ${row.source_url}`);
  if (!message) errors.push(`${candidateId || row.source_url} has no first message.`);
  if (!preflightRow) errors.push(`${candidateId || row.source_url} has no live preflight result.`);
  if (preflightRow && preflightRow.decision !== "send_ok") {
    errors.push(`${candidateId} is ${preflightRow.decision}, not send_ok.`);
  }

  return {
    order: index + 1,
    candidate_id: candidateId,
    source: row.source,
    source_url: row.source_url,
    listing_title: row.listing_title,
    location: row.location,
    asking_price: row.asking_price,
    ai_grade: row.ai_grade,
    public_contact: row.public_contact,
    message,
    preflight_status: preflightRow?.decision || "missing",
    session_report_sent: `${candidateId} | sent | sent manually via ${row.source}`,
    session_report_blocked: `${candidateId} | blocked | inactive, reserved, brokered, duplicate, or no usable contact path`,
    contacted_command: `npm run leads:manual-status -- ${candidateId} contacted --follow-up=${row.next_follow_up_at || "2026-06-22"} --notes="sent manually via ${row.source}"`,
    not_fit_command: `npm run leads:manual-status -- ${candidateId} not_fit --notes="send session failed: inactive, reserved, brokered, duplicate, or no usable contact path"`,
  };
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const markdown = `# Manual owner hunting send session

Date: ${today}

Purpose: the shortest possible send surface for the current 10 live-checked owner outreach messages.

Machine-readable packet:

- CSV: \`${packetCsvOutputPath}\`
- JSON: \`${packetJsonOutputPath}\`
- Session report template: \`${sessionReportTemplateOutputPath}\`

Gate:

\`\`\`text
${preflight.counts.send_ok}/10 send_ok
${preflight.counts.manual_check}/10 manual_check
${preflight.counts.do_not_send}/10 do_not_send
\`\`\`

Rule: send one message, mark the row as sent or blocked in the HTML session, then apply the copied session report through closeout. Do not mark contacted until the message was actually sent.

${queue
  .map(
    (row) => `## ${row.order}. ${row.candidate_id} - ${row.location}

- Source: ${row.source}
- Grade: ${row.ai_grade}
- Price: ${row.asking_price}
- Preflight: ${row.preflight_status}
- Listing: ${row.source_url}
- Contact path: ${row.public_contact}
- Session report if sent: \`${row.session_report_sent}\`
- Session report if blocked: \`${row.session_report_blocked}\`

\`\`\`text
${row.message}
\`\`\`

\`\`\`bash
${row.contacted_command}
${row.not_fit_command}
\`\`\`
`,
  )
  .join("\n")}
`;

const packetRows = [
  [
    "order",
    "candidate_id",
    "source",
    "source_url",
    "listing_title",
    "location",
    "asking_price",
    "ai_grade",
    "preflight_status",
    "public_contact",
    "first_message",
    "session_report_sent",
    "session_report_blocked",
    "contacted_command",
    "not_fit_command",
  ],
  ...queue.map((row) => [
    row.order,
    row.candidate_id,
    row.source,
    row.source_url,
    row.listing_title,
    row.location,
    row.asking_price,
    row.ai_grade,
    row.preflight_status,
    row.public_contact,
    row.message,
    row.session_report_sent,
    row.session_report_blocked,
    row.contacted_command,
    row.not_fit_command,
  ]),
];

const sessionReportTemplate = `${queue.map((row) => `${row.candidate_id} | open |`).join("\n")}\n`;

const cards = queue
  .map(
    (row) => `<article class="lead" data-lead-card="${escapeHtml(row.candidate_id)}">
      <div class="lead-main">
        <div class="meta">
          <strong>${escapeHtml(row.order)}. ${escapeHtml(row.candidate_id)}</strong>
          <span>${escapeHtml(row.source)}</span>
          <span>${escapeHtml(row.ai_grade)}</span>
          <span>${escapeHtml(row.preflight_status)}</span>
        </div>
        <h2>${escapeHtml(row.listing_title)}</h2>
        <p>${escapeHtml(row.location)} · ${escapeHtml(row.asking_price)}</p>
        <label class="sent-check">
          <input type="checkbox" data-mark-sent="${escapeHtml(row.candidate_id)}" />
          <span>Odoslané ručne v platforme</span>
        </label>
        <label class="sent-check">
          <input type="checkbox" data-mark-blocked="${escapeHtml(row.candidate_id)}" />
          <span>Stop / nepoužiteľné po otvorení</span>
        </label>
        <textarea class="session-note" id="note-${escapeHtml(row.candidate_id)}" data-session-note="${escapeHtml(row.candidate_id)}" placeholder="Lokálna poznámka k session, neukladá sa do repo. Nekopíruj sem telefón ani email."></textarea>
      </div>
      <div class="actions">
        <ol class="steps">
          <li>Otvoriť inzerát a použiť platformový kontakt.</li>
          <li>Skopírovať a poslať prvú správu.</li>
          <li>Označiť sent alebo stop. Statusy zapíše closeout report.</li>
        </ol>
        <a class="button secondary" href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">Otvoriť inzerát</a>
        <button class="button primary" type="button" data-copy-message="${escapeHtml(row.candidate_id)}">Kopírovať správu</button>
        <textarea id="message-${escapeHtml(row.candidate_id)}" readonly>${escapeHtml(row.message)}</textarea>
        <button class="button secondary" type="button" data-copy-command="${escapeHtml(row.candidate_id)}">Kopírovať contacted</button>
        <code id="command-${escapeHtml(row.candidate_id)}">${escapeHtml(row.contacted_command)}</code>
        <button class="button secondary" type="button" data-copy-stop="${escapeHtml(row.candidate_id)}">Kopírovať stop</button>
        <code id="stop-${escapeHtml(row.candidate_id)}">${escapeHtml(row.not_fit_command)}</code>
      </div>
    </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Manual owner hunting send session</title>
    <style>
      :root { color-scheme: light; --ink:#171411; --muted:#6a625b; --line:#ded8cf; --paper:#fffaf2; --soft:#f2ece3; --accent:#8b4e2d; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .shell { width: min(980px, calc(100% - 32px)); margin: 0 auto; }
      header { position: sticky; top: 0; z-index: 4; border-bottom: 1px solid var(--line); background: rgba(255,250,242,.94); backdrop-filter: blur(12px); }
      .header-inner { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 0; }
      h1 { margin: 0; font-size: 28px; line-height: 1.05; }
      header p { margin: 4px 0 0; color: var(--muted); }
      .stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: end; }
      .stat { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 8px 10px; min-width: 88px; text-align: right; }
      .stat strong { display: block; font-size: 20px; line-height: 1; }
      .stat span { color: var(--muted); font-size: 12px; }
      .progress { grid-column: 1 / -1; height: 8px; overflow: hidden; border-radius: 999px; border: 1px solid var(--line); background: #fff; }
      .progress span { display: block; width: 0; height: 100%; background: var(--accent); transition: width 160ms ease; }
      .session-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .session-status { grid-column: 1 / -1; margin: 0; color: var(--muted); text-align: right; }
      .session-status strong { color: var(--ink); }
      main { display: grid; gap: 14px; padding: 20px 0 44px; }
      .lead { display: grid; grid-template-columns: minmax(0, .8fr) minmax(320px, 1fr); gap: 16px; border-top: 1px solid var(--line); padding: 18px 0; }
      .lead.is-done { opacity: .72; }
      .lead.is-blocked { background: rgba(139,78,45,.07); }
      .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
      .meta span, .meta strong { border: 1px solid var(--line); border-radius: 999px; background: #fff; padding: 4px 8px; font-size: 12px; }
      h2 { margin: 0 0 6px; font-size: 20px; line-height: 1.2; }
      .lead-main p { margin: 0; color: var(--muted); }
      .sent-check { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 8px 10px; font-weight: 750; }
      .sent-check input { width: 18px; height: 18px; accent-color: var(--accent); }
      .actions { display: grid; gap: 10px; align-content: start; }
      .steps { margin: 0; padding: 12px 12px 12px 32px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--muted); }
      .steps li + li { margin-top: 4px; }
      .button { min-height: 40px; border-radius: 7px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; font-weight: 750; cursor: pointer; text-decoration: none; }
      .button.primary { border: 1px solid var(--ink); background: var(--ink); color: var(--paper); }
      .button.secondary { border: 1px solid var(--line); background: #fff; color: var(--ink); }
      .button:disabled { opacity: .42; cursor: not-allowed; }
      textarea { width: 100%; min-height: 150px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fff; color: var(--ink); font: 14px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .session-note { min-height: 88px; margin-top: 12px; }
      code { display: block; overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: var(--soft); white-space: nowrap; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .toast { position: fixed; right: 18px; bottom: 18px; border-radius: 8px; padding: 12px 14px; background: var(--ink); color: var(--paper); opacity: 0; transform: translateY(8px); transition: 160ms ease; }
      .toast.is-visible { opacity: 1; transform: translateY(0); }
      @media (max-width: 760px) { .header-inner, .lead { grid-template-columns: 1fr; } .stats { justify-content: start; } }
    </style>
  </head>
  <body>
    <header>
      <div class="shell header-inner">
        <div>
          <h1>Send session</h1>
          <p>One live-checked message at a time. Update status immediately after sending.</p>
        </div>
        <div class="stats">
          <div class="stat"><strong>${queue.length}</strong><span>ready</span></div>
          <div class="stat"><strong>${preflight.counts.send_ok}</strong><span>send ok</span></div>
          <div class="stat"><strong data-local-sent>0</strong><span>marked sent</span></div>
          <div class="stat"><strong data-local-blocked>0</strong><span>marked stop</span></div>
          <div class="stat"><strong data-local-open>${queue.length}</strong><span>open</span></div>
          <div class="stat"><strong>${preflight.counts.do_not_send}</strong><span>blocked</span></div>
        </div>
        <div class="progress" aria-label="Session progress"><span data-local-progress></span></div>
        <div class="session-actions">
          <button class="button secondary" type="button" data-jump-next>Ďalší otvorený</button>
          <button class="button secondary" type="button" data-copy-session-report>Kopírovať session report</button>
          <button class="button secondary" type="button" data-copy-closeout-dry-run>Kopírovať dry-run closeout</button>
          <button class="button primary" type="button" data-copy-closeout-apply>Kopírovať apply + refill</button>
        </div>
        <p class="session-status" data-session-status><strong>${queue.length}</strong> otvorených riadkov. Apply spusti až keď report sedí s realitou.</p>
      </div>
    </header>
    <main class="shell">${cards}</main>
    <div class="toast" data-toast>Skopírované</div>
    <script>
      const toast = document.querySelector("[data-toast]");
      const copyText = async (text, label) => {
        if (!text) return;
        try { await navigator.clipboard.writeText(text); } catch {}
        if (toast) {
          toast.textContent = label;
          toast.classList.add("is-visible");
          window.setTimeout(() => toast.classList.remove("is-visible"), 1300);
        }
      };
      const storageKey = "manual-owner-hunting-send-session:${today}";
      const blockedStorageKey = storageKey + ":blocked";
      const notesStorageKey = storageKey + ":notes";
      const sentCounter = document.querySelector("[data-local-sent]");
      const blockedCounter = document.querySelector("[data-local-blocked]");
      const openCounter = document.querySelector("[data-local-open]");
      const progressBar = document.querySelector("[data-local-progress]");
      const sessionStatus = document.querySelector("[data-session-status]");
      const applyCloseoutButton = document.querySelector("[data-copy-closeout-apply]");
      const readDone = () => {
        try { return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
        catch { return new Set(); }
      };
      const readBlocked = () => {
        try { return new Set(JSON.parse(localStorage.getItem(blockedStorageKey) || "[]")); }
        catch { return new Set(); }
      };
      const readNotes = () => {
        try { return JSON.parse(localStorage.getItem(notesStorageKey) || "{}"); }
        catch { return {}; }
      };
      const writeDone = (done) => localStorage.setItem(storageKey, JSON.stringify([...done]));
      const writeBlocked = (blocked) => localStorage.setItem(blockedStorageKey, JSON.stringify([...blocked]));
      const writeNotes = (notes) => localStorage.setItem(notesStorageKey, JSON.stringify(notes));
      const renderDone = () => {
        const done = readDone();
        const blocked = readBlocked();
        const completedCount = new Set([...done, ...blocked]).size;
        const openCount = ${queue.length} - completedCount;
        document.querySelectorAll("[data-mark-sent]").forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          const id = input.dataset.markSent || "";
          const checked = done.has(id);
          input.checked = checked;
          document.querySelector('[data-lead-card="' + id + '"]')?.classList.toggle("is-done", checked);
        });
        document.querySelectorAll("[data-mark-blocked]").forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          const id = input.dataset.markBlocked || "";
          const checked = blocked.has(id);
          input.checked = checked;
          document.querySelector('[data-lead-card="' + id + '"]')?.classList.toggle("is-blocked", checked);
        });
        if (sentCounter) sentCounter.textContent = String(done.size);
        if (blockedCounter) blockedCounter.textContent = String(blocked.size);
        if (openCounter) openCounter.textContent = String(openCount);
        if (progressBar) progressBar.style.width = String(Math.round((completedCount / ${queue.length || 1}) * 100)) + "%";
        if (applyCloseoutButton instanceof HTMLButtonElement) {
          applyCloseoutButton.disabled = openCount > 0;
          applyCloseoutButton.title = openCount > 0
            ? "Najprv označ všetky riadky ako sent alebo stop."
            : "Report je kompletný. Najprv spusti dry-run, potom apply.";
        }
        if (sessionStatus) {
          sessionStatus.innerHTML = openCount
            ? "<strong>" + openCount + "</strong> otvorených riadkov. Apply spusti až keď report sedí s realitou."
            : "<strong>0</strong> otvorených riadkov. Report je pripravený na dry-run a potom apply.";
        }
      };
      const renderNotes = () => {
        const notes = readNotes();
        document.querySelectorAll("[data-session-note]").forEach((input) => {
          if (!(input instanceof HTMLTextAreaElement)) return;
          input.value = notes[input.dataset.sessionNote || ""] || "";
        });
      };
      const buildSessionReport = () => {
        const done = readDone();
        const blocked = readBlocked();
        const notes = readNotes();
        const ids = ${JSON.stringify(queue.map((row) => row.candidate_id))};
        return ids.map((id) => {
          const status = done.has(id) ? "sent" : blocked.has(id) ? "blocked" : "open";
          const note = String(notes[id] || "").replace(/\\s+/g, " ").trim();
          return [id, status, note].join(" | ");
        }).join("\\n");
      };
      const buildCloseoutCommand = (apply) => {
        const report = buildSessionReport().replace(/^EOF$/gm, "EOF ");
        return [
          "tmpfile=$(mktemp)",
          "cat > \\"$tmpfile\\" <<'EOF'",
          report,
          "EOF",
          apply
            ? "npm run leadgen:send-day-closeout -- --report=\\"$tmpfile\\" --apply --apply-next-wave"
            : "npm run leadgen:send-day-closeout -- --report=\\"$tmpfile\\"",
          "rm \\"$tmpfile\\"",
        ].join("\\n");
      };
      renderDone();
      renderNotes();
      document.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        const done = readDone();
        const blocked = readBlocked();
        if (target.dataset.markSent) {
          if (target.checked) {
            done.add(target.dataset.markSent);
            blocked.delete(target.dataset.markSent);
          } else {
            done.delete(target.dataset.markSent);
          }
          writeDone(done);
          writeBlocked(blocked);
        }
        if (target.dataset.markBlocked) {
          if (target.checked) {
            blocked.add(target.dataset.markBlocked);
            done.delete(target.dataset.markBlocked);
          } else {
            blocked.delete(target.dataset.markBlocked);
          }
          writeDone(done);
          writeBlocked(blocked);
        }
        renderDone();
      });
      document.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLTextAreaElement) || !target.dataset.sessionNote) return;
        const notes = readNotes();
        notes[target.dataset.sessionNote] = target.value;
        writeNotes(notes);
      });
      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[data-jump-next]")) {
          const done = readDone();
          const blocked = readBlocked();
          const next = [...document.querySelectorAll("[data-lead-card]")].find((card) => {
            const id = card.getAttribute("data-lead-card") || "";
            return !done.has(id) && !blocked.has(id);
          });
          next?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (target.closest("[data-copy-session-report]")) {
          copyText(buildSessionReport(), "Session report");
        }
        if (target.closest("[data-copy-closeout-dry-run]")) {
          copyText(buildCloseoutCommand(false), "Dry-run closeout");
        }
        if (target.closest("[data-copy-closeout-apply]")) {
          copyText(buildCloseoutCommand(true), "Apply closeout");
        }
        const messageButton = target.closest("[data-copy-message]");
        if (messageButton instanceof HTMLElement) {
          const id = messageButton.dataset.copyMessage;
          copyText(document.getElementById("message-" + id)?.value || "", "Správa " + id);
        }
        const commandButton = target.closest("[data-copy-command]");
        if (commandButton instanceof HTMLElement) {
          const id = commandButton.dataset.copyCommand;
          copyText(document.getElementById("command-" + id)?.textContent || "", "Contacted " + id);
        }
        const stopButton = target.closest("[data-copy-stop]");
        if (stopButton instanceof HTMLElement) {
          const id = stopButton.dataset.copyStop;
          copyText(document.getElementById("stop-" + id)?.textContent || "", "Stop " + id);
        }
      });
    </script>
  </body>
</html>
`;

writeFileSync(markdownOutputPath, markdown);
writeFileSync(htmlOutputPath, html);
writeFileSync(packetCsvOutputPath, stringifyCsv(packetRows));
writeFileSync(sessionReportTemplateOutputPath, sessionReportTemplate);
writeFileSync(
  packetJsonOutputPath,
  `${JSON.stringify(
    {
      date: today,
      preflight: {
        send_ok: preflight.counts.send_ok,
        manual_check: preflight.counts.manual_check,
        do_not_send: preflight.counts.do_not_send,
      },
      queue,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      queue_count: queue.length,
      send_ok: preflight.counts.send_ok,
      markdown: markdownOutputPath,
      html: htmlOutputPath,
      packet_csv: packetCsvOutputPath,
      packet_json: packetJsonOutputPath,
      session_report_template: sessionReportTemplateOutputPath,
    },
    null,
    2,
  ),
);
