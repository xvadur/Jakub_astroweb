import { readFileSync, writeFileSync } from "node:fs";

const mainCandidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const expansionCandidatesPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const messagesPath = "ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md";
const markdownOutputPath = "ops/leads/manual-owner-hunting-next-wave-2026-06-19.md";
const htmlOutputPath = "ops/leads/manual-owner-hunting-next-wave-2026-06-19.html";
const jsonOutputPath = "ops/leads/manual-owner-hunting-next-wave-2026-06-19.json";

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

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

const parseArgs = (args) => {
  const options = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rawValue] = arg.slice(2).split("=");
    options[rawKey] = rawValue.length ? rawValue.join("=") : "true";
  }

  return options;
};

const readMessages = (path) => {
  const text = readFileSync(path, "utf8");
  const messages = new Map();

  for (const section of text.split(/\n##\s+/).slice(1)) {
    const id = section.match(/\bHUNT-\d{3}\b/)?.[0];
    const firstMessage = section.match(/```text\n([\s\S]*?)\n```/)?.[1]?.trim();
    const auditReply = section.match(/Audit reply:\n\n```text\n([\s\S]*?)\n```/)?.[1]?.trim();
    if (id) messages.set(id, { firstMessage: firstMessage || "", auditReply: auditReply || "" });
  }

  return messages;
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const hardStopMarkers = [
  "rezervovane",
  "rezervovany",
  "rezervovana",
  "predane",
  "inzerat uz nie je v ponuke",
  "na inzerat uz nie je mozne reagovat",
  "inzerat neexistuje",
  "inzerat bol zmazany",
  "ponuka nie je aktivna",
  "nehnutelnost uz nie je dostupna",
];

const activeMarkersBySource = {
  "Bezrealitky": [
    "vyziadajte si prehliadku",
    "kontaktovat majitela",
    "majitel",
    "bezrealitky",
    "predaj bytu",
  ],
  "Bezmaklerov": [
    "bezmaklerov",
    "kontaktovat",
    "predam",
    "predaj",
    "nehnutelnost",
  ],
  "Bazoš": [
    "odpovedat na inzerat",
    "meno",
    "telefon",
    "reality.bazos.sk",
    "predam",
  ],
};

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const getMatchedMarkers = (text, markers) => markers.filter((marker) => text.includes(marker));

const fetchListing = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "sk-SK,sk;q=0.9,cs;q=0.8,en;q=0.7",
        "user-agent": userAgent,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });

    const html = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      final_url: response.url,
      text: normalize(stripHtml(html)),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      final_url: url,
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const decide = (row, fetched) => {
  if (!fetched.ok) {
    return {
      decision: "manual_check",
      reasons: [`fetch_failed:${fetched.status || "network"}`, fetched.error].filter(Boolean),
    };
  }

  const hardStops = getMatchedMarkers(fetched.text, hardStopMarkers);
  if (hardStops.length) {
    return {
      decision: "do_not_import",
      reasons: hardStops.map((marker) => `hard_stop:${marker}`),
    };
  }

  const activeMarkers = getMatchedMarkers(fetched.text, activeMarkersBySource[row.source] || []);
  if (activeMarkers.length) {
    return {
      decision: "import_ready",
      reasons: activeMarkers.slice(0, 4).map((marker) => `active_marker:${marker}`),
    };
  }

  return {
    decision: "manual_check",
    reasons: ["no_hard_stop_found", "no_source_specific_active_marker_found"],
  };
};

const gradeRank = { A: 0, B: 1, C: 2 };
const options = parseArgs(process.argv.slice(2));
const target = Number(options.target || 10);
const maxCheck = Number(options["max-check"] || Math.max(target + 20, target));

if (!Number.isInteger(target) || target < 1) {
  console.error("--target must be a positive integer.");
  process.exit(1);
}

if (!Number.isInteger(maxCheck) || maxCheck < target) {
  console.error("--max-check must be an integer greater than or equal to --target.");
  process.exit(1);
}

const mainCandidates = readTable(mainCandidatesPath).filter((row) => row.candidate_id);
const expansionCandidates = readTable(expansionCandidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const messages = readMessages(messagesPath);
const mainIds = new Set(mainCandidates.map((row) => row.candidate_id));
const loggedUrls = new Set(logRows.map((row) => row.source_url));

const candidatePool = expansionCandidates
  .filter((candidate) => candidate.ai_grade === "A" || candidate.ai_grade === "B")
  .filter((candidate) => !mainIds.has(candidate.candidate_id) && !loggedUrls.has(candidate.source_url))
  .sort(
    (a, b) =>
      (gradeRank[a.ai_grade] ?? 9) - (gradeRank[b.ai_grade] ?? 9) ||
      a.candidate_id.localeCompare(b.candidate_id),
  );

const rows = [];
let importReadyCount = 0;
for (const candidate of candidatePool) {
  if (rows.length >= maxCheck || importReadyCount >= target) break;

  const fetched = await fetchListing(candidate.source_url);
  const verdict = decide(candidate, fetched);
  const message = messages.get(candidate.candidate_id) || {};
  const importCommand =
    verdict.decision === "import_ready"
      ? `npm run leads:manual-import-expansion -- ${candidate.candidate_id} ready_to_send --follow-up=2026-06-24 --notes="next-wave live preflight import_ready"`
      : "";

  rows.push({
    date: today,
    candidate_id: candidate.candidate_id,
    source: candidate.source,
    source_url: candidate.source_url,
    final_url: fetched.final_url,
    listing_title: candidate.listing_title,
    property_type: candidate.property_type,
    location: candidate.location,
    asking_price: candidate.asking_price,
    ai_grade: candidate.ai_grade,
    http_status: fetched.status,
    decision: verdict.decision,
    reasons: verdict.reasons,
    first_message: message.firstMessage || "",
    audit_reply: message.auditReply || "",
    import_command: importCommand,
  });

  if (verdict.decision === "import_ready") {
    importReadyCount += 1;
  }
}

const counts = rows.reduce(
  (acc, row) => {
    acc[row.decision] = (acc[row.decision] || 0) + 1;
    acc.total += 1;
    return acc;
  },
  { total: 0, import_ready: 0, manual_check: 0, do_not_import: 0 },
);

const importCommands = rows.map((row) => row.import_command).filter(Boolean);
const result = {
  date: today,
  target,
  max_check: maxCheck,
  candidate_pool_count: candidatePool.length,
  counts,
  import_commands_count: importCommands.length,
  output_markdown_path: markdownOutputPath,
  output_html_path: htmlOutputPath,
  output_json_path: jsonOutputPath,
  rows,
};

const markdownRows = rows.length
  ? rows
      .map(
        (row, index) => `## ${index + 1}. ${row.candidate_id} - ${row.location}

- Decision: ${row.decision}
- Source: ${row.source}
- Grade: ${row.ai_grade}
- Price: ${row.asking_price}
- Status: ${row.http_status || "network"}
- Reasons: ${row.reasons.join("; ")}
- Listing: ${row.source_url}

First message:

\`\`\`text
${row.first_message || "MISSING MESSAGE"}
\`\`\`

Import command:

\`\`\`bash
${row.import_command || "# manual check required before import"}
\`\`\`
`,
      )
      .join("\n")
  : "No next-wave candidates available.";

const markdown = `# Manual owner hunting next wave

Date: ${today}

Purpose: prepare ${target} import-ready expansion candidates for manual import after the active send queue is handled. This file does not mutate lead status.

Summary:

\`\`\`json
${JSON.stringify(counts, null, 2)}
\`\`\`

Rules:

- Import only \`import_ready\` rows.
- \`target\` means target import-ready rows; the scan can check extra rows when some candidates fail live preflight.
- Open every detail page before sending anyway.
- Do not store phone numbers, emails, or private contact details in repo.
- After importing, run live preflight and regenerate send session.

Run import-ready commands sequentially:

\`\`\`bash
${importCommands.join("\n") || "# no import-ready commands"}
\`\`\`

${markdownRows}
`;

const cards = rows
  .map(
    (row, index) => `<article class="candidate ${row.decision}">
      <div class="main">
        <div class="meta">
          <strong>${index + 1}. ${escapeHtml(row.candidate_id)}</strong>
          <span>${escapeHtml(row.decision)}</span>
          <span>${escapeHtml(row.source)}</span>
          <span>${escapeHtml(row.ai_grade)}</span>
        </div>
        <h2>${escapeHtml(row.listing_title)}</h2>
        <p>${escapeHtml(row.location)} · ${escapeHtml(row.asking_price)}</p>
        <p>${escapeHtml(row.reasons.join("; "))}</p>
        <a class="button primary" href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">Otvoriť detail</a>
      </div>
      <div class="actions">
        <button class="button secondary" type="button" data-copy-message="${escapeHtml(row.candidate_id)}">Kopírovať správu</button>
        <textarea id="message-${escapeHtml(row.candidate_id)}" readonly>${escapeHtml(row.first_message || "MISSING MESSAGE")}</textarea>
        <button class="button secondary" type="button" data-copy-import="${escapeHtml(row.candidate_id)}"${row.import_command ? "" : " disabled"}>Kopírovať import</button>
        <code id="import-${escapeHtml(row.candidate_id)}">${escapeHtml(row.import_command || "manual check required before import")}</code>
      </div>
    </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Next wave review</title>
    <style>
      :root { --ink:#171411; --muted:#6a625b; --line:#ded8cf; --paper:#fffaf2; --soft:#f2ece3; --accent:#8b4e2d; --bad:#7a1f1f; --ok:#1f6f4a; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .shell { width: min(1040px, calc(100% - 32px)); margin: 0 auto; }
      header { position: sticky; top: 0; z-index: 3; border-bottom: 1px solid var(--line); background: rgba(255,250,242,.94); backdrop-filter: blur(12px); }
      .header-inner { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 0; }
      h1 { margin: 0; font-size: 28px; line-height: 1.05; }
      header p { margin: 4px 0 0; color: var(--muted); }
      .stats { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .stat { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 8px 10px; min-width: 92px; text-align: right; }
      .stat strong { display: block; font-size: 20px; line-height: 1; }
      .stat span { color: var(--muted); font-size: 12px; }
      main { display: grid; gap: 18px; padding: 20px 0 44px; }
      .candidate { display: grid; grid-template-columns: minmax(0,.82fr) minmax(340px,1fr); gap: 18px; border-top: 1px solid var(--line); padding-top: 18px; }
      .candidate.import_ready { border-top-color: var(--ok); }
      .candidate.do_not_import { border-top-color: var(--bad); opacity: .75; }
      .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
      .meta span, .meta strong { border: 1px solid var(--line); border-radius: 999px; background: #fff; padding: 4px 8px; font-size: 12px; }
      h2 { margin: 0 0 6px; font-size: 20px; line-height: 1.2; }
      p { margin: 0 0 8px; color: var(--muted); }
      .actions { display: grid; gap: 10px; align-content: start; }
      .button { min-height: 40px; border-radius: 7px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; font-weight: 750; cursor: pointer; text-decoration: none; }
      .button.primary { border: 1px solid var(--ink); background: var(--ink); color: var(--paper); }
      .button.secondary { border: 1px solid var(--line); background: #fff; color: var(--ink); }
      .button:disabled { cursor: not-allowed; opacity: .45; }
      textarea { width: 100%; min-height: 124px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fff; color: var(--ink); font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      code { display: block; overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: var(--soft); white-space: nowrap; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .toast { position: fixed; right: 18px; bottom: 18px; border-radius: 8px; padding: 12px 14px; background: var(--ink); color: var(--paper); opacity: 0; transform: translateY(8px); transition: 160ms ease; }
      .toast.is-visible { opacity: 1; transform: translateY(0); }
      @media (max-width: 780px) { .header-inner, .candidate { grid-template-columns: 1fr; } .stats { justify-content: start; } }
    </style>
  </head>
  <body>
    <header>
      <div class="shell header-inner">
        <div>
          <h1>Next wave review</h1>
          <p>Expansion candidates preflighted for import after the active send queue.</p>
        </div>
        <div class="stats">
          <div class="stat"><strong>${counts.total}</strong><span>checked</span></div>
          <div class="stat"><strong>${counts.import_ready}</strong><span>import ready</span></div>
          <div class="stat"><strong>${counts.manual_check}</strong><span>manual</span></div>
          <div class="stat"><strong>${counts.do_not_import}</strong><span>stop</span></div>
        </div>
      </div>
    </header>
    <main class="shell">${cards || "<p>No next-wave candidates available.</p>"}</main>
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
        const messageButton = target.closest("[data-copy-message]");
        if (messageButton instanceof HTMLElement) {
          const id = messageButton.dataset.copyMessage;
          copyText(document.getElementById("message-" + id)?.value || "", "Správa " + id);
        }
        const importButton = target.closest("[data-copy-import]");
        if (importButton instanceof HTMLElement) {
          const id = importButton.dataset.copyImport;
          copyText(document.getElementById("import-" + id)?.textContent || "", "Import " + id);
        }
      });
    </script>
  </body>
</html>
`;

writeFileSync(jsonOutputPath, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(markdownOutputPath, markdown);
writeFileSync(htmlOutputPath, html);

console.log(
  JSON.stringify(
    {
      date: today,
      target,
      counts,
      import_commands_count: importCommands.length,
      markdown: markdownOutputPath,
      html: htmlOutputPath,
      json: jsonOutputPath,
    },
    null,
    2,
  ),
);
