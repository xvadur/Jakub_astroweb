import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const outputMarkdownPath = "ops/leads/manual-owner-hunting-live-preflight-2026-06-19.md";
const outputJsonPath = "ops/leads/manual-owner-hunting-live-preflight-2026-06-19.json";

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
  "Bazoš": [
    "odpovedat na inzerat",
    "meno",
    "telefon",
    "reality.bazos.sk",
    "predam",
  ],
};

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
      decision: "do_not_send",
      reasons: hardStops.map((marker) => `hard_stop:${marker}`),
    };
  }

  const activeMarkers = getMatchedMarkers(fetched.text, activeMarkersBySource[row.source] || []);
  if (activeMarkers.length) {
    return {
      decision: "send_ok",
      reasons: activeMarkers.slice(0, 4).map((marker) => `active_marker:${marker}`),
    };
  }

  return {
    decision: "manual_check",
    reasons: ["no_hard_stop_found", "no_source_specific_active_marker_found"],
  };
};

const markdownTable = (rows) => {
  const header = "| ID | Source | Status | Decision | Listing | Reasons | URL |\n|---|---|---:|---|---|---|---|";
  const body = rows
    .map((row) =>
      [
        row.candidate_id,
        row.source,
        row.http_status || "network",
        row.decision,
        row.listing_title,
        row.reasons.join("; "),
        row.final_url,
      ]
        .map((value) => String(value || "").replace(/\|/g, "\\|"))
        .join(" | "),
    )
    .map((line) => `| ${line} |`)
    .join("\n");

  return `${header}\n${body}`;
};

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
const readyRows = logRows.filter((row) => row.status === "ready_to_send");

const results = [];

for (const row of readyRows) {
  const candidate = candidatesByUrl.get(row.source_url);
  const fetched = await fetchListing(row.source_url);
  const verdict = decide(row, fetched);

  results.push({
    date: today,
    candidate_id: candidate?.candidate_id || "UNKNOWN",
    source: row.source,
    source_url: row.source_url,
    final_url: fetched.final_url,
    listing_title: row.listing_title,
    http_status: fetched.status,
    decision: verdict.decision,
    reasons: verdict.reasons,
  });
}

const counts = results.reduce(
  (acc, row) => {
    acc[row.decision] = (acc[row.decision] || 0) + 1;
    acc.total += 1;
    return acc;
  },
  { total: 0, send_ok: 0, manual_check: 0, do_not_send: 0 },
);

const summary = {
  ok_to_continue: counts.do_not_send === 0,
  date: today,
  queue_size: readyRows.length,
  counts,
  output_markdown_path: outputMarkdownPath,
  output_json_path: outputJsonPath,
  results,
};

const markdown = `# Manual owner hunting live preflight

Date: ${today}

Purpose: repeatable live URL check for the current ready-to-send queue. This does not mutate the lead log; use \`npm run leads:manual-status\` after human review if a listing fails.

## Summary

\`\`\`json
${JSON.stringify(counts, null, 2)}
\`\`\`

## Decisions

${markdownTable(results)}

## Rules

- \`send_ok\`: page fetched and source-specific active listing markers were visible.
- \`manual_check\`: no hard stop was found, but the fetched HTML was incomplete, blocked, or did not expose enough active markers.
- \`do_not_send\`: fetched text contained a reservation, sold, inactive, deleted, or not-contactable marker.

If a row is \`do_not_send\`, mark it before outreach:

\`\`\`bash
npm run leads:manual-status -- HUNT-001 not_fit --notes="live preflight failed: reserved/inactive"
npm run leads:manual-promote
npm run leads:manual-validate
npm run leads:manual-export
npm run leads:manual-cockpit
\`\`\`
`;

writeFileSync(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);

console.log(JSON.stringify(summary, null, 2));

if (counts.do_not_send > 0) {
  process.exit(1);
}
