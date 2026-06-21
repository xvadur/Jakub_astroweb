import { readFileSync, writeFileSync } from "node:fs";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const parseArgs = (argv) =>
  argv.reduce((acc, arg) => {
    if (!arg.startsWith("--")) return acc;
    const [key, ...valueParts] = arg.slice(2).split("=");
    acc[key] = valueParts.length ? valueParts.join("=") : "true";
    return acc;
  }, {});

const args = parseArgs(process.argv.slice(2));
const sanitizeLabel = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const scanLabel = sanitizeLabel(args.label);
const outputLabel = scanLabel ? `-${scanLabel}` : "";
const scanCsvPath =
  args.scan || `ops/leads/manual-owner-hunting-source-scan${outputLabel}-${today}.csv`;
const markdownOutputPath = `ops/leads/manual-owner-hunting-source-review${outputLabel}-${today}.md`;
const htmlOutputPath = `ops/leads/manual-owner-hunting-source-review${outputLabel}-${today}.html`;

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

const scanRows = readTable(scanCsvPath).filter(
  (row) => row.source_url && row.duplicate_existing === "no" && ["A", "B"].includes(row.review_priority),
);

const buildImportTemplate = (row) => `NEXT_ID,HUNT-___
source,${row.source}
source_url,${row.source_url}
listing_title,${row.listing_title}
suspected_owner_type,owner|private_seller|unclear_private_seller
property_type,${row.property_type_hint}
location,${row.location}
asking_price,${row.asking_price}
public_contact_path,Bazoš platform contact / phone reveal, do not store contact in repo
signal,manual_source_scan
ai_grade,${row.review_priority}
reason_for_grade,${row.reason}
deal_fit,${row.deal_fit || "unknown"}
deal_fit_reason,${row.deal_fit_reason || ""}
first_observation,[write from live detail after owner/private verification]
second_observation,[write buyer/value/price angle]
third_observation,[write risk or objection angle]
recommended_message_version,HUNT-___-source-scan
status,reviewed_not_contacted
notes,Source scan ${today}; manually verify owner/private seller before import.`;

const buildMessagePrompt = (row) => `Napíš krátku prvú správu po slovensky pre vlastníka inzerátu.

Listing: ${row.listing_title}
URL: ${row.source_url}
Lokalita/cena: ${row.location}, ${row.asking_price}
Typ: ${row.property_type_hint}
Deal fit: ${row.deal_fit || "unknown"} (${row.deal_fit_reason || ""})
Signály: ${row.reason}

Pravidlá:
- rešpektuj, ak nechce RK alebo ak je to súkromný predaj,
- nehovor "máme kupca",
- ponúkni 3 konkrétne postrehy k predajnej prezentácii/cene,
- max 3 krátke odseky,
- žiadny nátlak.`;

const rowsMarkdown = scanRows.length
  ? scanRows
      .map(
        (row, index) => `## ${index + 1}. ${row.review_priority} - ${row.listing_title}

- Source: ${row.source}
- Type: ${row.property_type_hint}
- Price: ${row.asking_price}
- Location: ${row.location}
- Deal fit: ${row.deal_fit || "unknown"} (${row.deal_fit_reason || ""})
- Reason: ${row.reason}
- URL: ${row.source_url}

Review checklist:

- [ ] Detail is active.
- [ ] Seller looks like owner/private seller, not RK.
- [ ] Contact path is available.
- [ ] It fits Jakub's Bratislava / Bratislava-region seller focus.
- [ ] No phone/email copied into repo.

Import template:

\`\`\`text
${buildImportTemplate(row)}
\`\`\`

Message prompt:

\`\`\`text
${buildMessagePrompt(row)}
\`\`\`
`,
      )
      .join("\n")
  : "No source-scan candidates need review.";

const markdown = `# Manual owner hunting source review

Date: ${today}

Purpose: manual review surface for source-scan candidates. This file does not authorize outreach.

Rules:

- Send nothing from this file.
- Open the listing and verify owner/private seller fit first.
- If fit is real, add candidate to expansion CSV and write both first-message and audit-reply drafts.
- Do not store phone numbers, emails, or personal contact details in repo.

Current review candidates: ${scanRows.length}

${rowsMarkdown}
`;

const cards = scanRows
  .map(
    (row, index) => `<article class="candidate" data-card="${index + 1}">
      <div class="candidate-main">
        <div class="meta">
          <strong>${escapeHtml(row.review_priority)}</strong>
          <span>${escapeHtml(row.source)}</span>
          <span>${escapeHtml(row.property_type_hint)}</span>
        </div>
        <h2>${escapeHtml(row.listing_title)}</h2>
        <p>${escapeHtml(row.location)} · ${escapeHtml(row.asking_price)}</p>
        <p class="deal">Deal fit: ${escapeHtml(row.deal_fit || "unknown")} ${row.deal_fit_reason ? `· ${escapeHtml(row.deal_fit_reason)}` : ""}</p>
        <p class="reason">${escapeHtml(row.reason)}</p>
        <label><input type="checkbox" /> active</label>
        <label><input type="checkbox" /> owner/private</label>
        <label><input type="checkbox" /> contact path</label>
        <label><input type="checkbox" /> region fit</label>
      </div>
      <div class="actions">
        <a class="button primary" href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">Otvoriť detail</a>
        <button class="button secondary" type="button" data-copy-import="${index + 1}">Kopírovať import</button>
        <textarea id="import-${index + 1}" readonly>${escapeHtml(buildImportTemplate(row))}</textarea>
        <button class="button secondary" type="button" data-copy-prompt="${index + 1}">Kopírovať prompt</button>
        <textarea id="prompt-${index + 1}" readonly>${escapeHtml(buildMessagePrompt(row))}</textarea>
      </div>
    </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Source review</title>
    <style>
      :root { --ink:#171411; --muted:#6d625b; --line:#ded8cf; --paper:#fffaf2; --soft:#f2ece3; --accent:#8b4e2d; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .shell { width: min(1040px, calc(100% - 32px)); margin: 0 auto; }
      header { position: sticky; top: 0; z-index: 3; border-bottom: 1px solid var(--line); background: rgba(255,250,242,.94); backdrop-filter: blur(12px); }
      .header-inner { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 0; }
      h1 { margin: 0; font-size: 28px; line-height: 1.05; }
      header p { margin: 4px 0 0; color: var(--muted); }
      .count { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 8px 10px; text-align: right; min-width: 96px; }
      .count strong { display: block; font-size: 22px; line-height: 1; }
      .count span { color: var(--muted); font-size: 12px; }
      main { display: grid; gap: 18px; padding: 20px 0 44px; }
      .candidate { display: grid; grid-template-columns: minmax(0,.85fr) minmax(340px,1fr); gap: 18px; border-top: 1px solid var(--line); padding-top: 18px; }
      .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
      .meta span, .meta strong { border: 1px solid var(--line); border-radius: 999px; background: #fff; padding: 4px 8px; font-size: 12px; }
      h2 { margin: 0 0 6px; font-size: 20px; line-height: 1.2; }
      p { margin: 0 0 8px; color: var(--muted); }
      .reason { color: var(--accent); }
      .deal { color: var(--ink); font-weight: 650; }
      label { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
      input { width: 17px; height: 17px; accent-color: var(--accent); }
      .actions { display: grid; gap: 10px; align-content: start; }
      .button { min-height: 40px; border-radius: 7px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; font-weight: 750; cursor: pointer; text-decoration: none; }
      .button.primary { border: 1px solid var(--ink); background: var(--ink); color: var(--paper); }
      .button.secondary { border: 1px solid var(--line); background: #fff; color: var(--ink); }
      textarea { width: 100%; min-height: 130px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fff; color: var(--ink); font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .toast { position: fixed; right: 18px; bottom: 18px; border-radius: 8px; padding: 12px 14px; background: var(--ink); color: var(--paper); opacity: 0; transform: translateY(8px); transition: 160ms ease; }
      .toast.is-visible { opacity: 1; transform: translateY(0); }
      @media (max-width: 780px) { .header-inner, .candidate { grid-template-columns: 1fr; } .count { text-align: left; } }
    </style>
  </head>
  <body>
    <header>
      <div class="shell header-inner">
        <div>
          <h1>Source review</h1>
          <p>Review-only pool. Verify owner/private seller before importing.</p>
        </div>
        <div class="count"><strong>${scanRows.length}</strong><span>to review</span></div>
      </div>
    </header>
    <main class="shell">${cards || "<p>No source-scan candidates need review.</p>"}</main>
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
      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const importButton = target.closest("[data-copy-import]");
        if (importButton instanceof HTMLElement) {
          const id = importButton.dataset.copyImport;
          copyText(document.getElementById("import-" + id)?.value || "", "Import " + id);
        }
        const promptButton = target.closest("[data-copy-prompt]");
        if (promptButton instanceof HTMLElement) {
          const id = promptButton.dataset.copyPrompt;
          copyText(document.getElementById("prompt-" + id)?.value || "", "Prompt " + id);
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
      review_count: scanRows.length,
      markdown: markdownOutputPath,
      html: htmlOutputPath,
    },
    null,
    2,
  ),
);
