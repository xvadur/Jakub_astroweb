import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const paths = {
  mainCandidates: "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv",
  expansionCandidates: "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv",
  log: "ops/leads/manual-owner-hunting-log-2026-06-19.csv",
  leadsDir: "ops/leads",
  markdown: `ops/leads/manual-owner-hunting-quality-audit-${today}.md`,
  json: `ops/leads/manual-owner-hunting-quality-audit-${today}.json`,
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
  if (!existsSync(path)) return [];
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0] || [];
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

const hasAny = (text, terms) => terms.some((term) => text.includes(normalize(term)));

const buyerDemandSignals = [
  "hľadám",
  "hladam",
  "hľadame",
  "hladame",
  "kúpim",
  "kupim",
  "kúpime",
  "kupime",
  "máme záujem o kúpu",
  "mame zaujem o kupu",
  "hľadáme byt",
  "hladame byt",
  "platba v hotovosti",
];

const brokerDeveloperSignals = [
  "realitná",
  "realitna",
  "realitný",
  "realitny",
  "realitnej kancelárie",
  "realitnej kancelarie",
  "kancelária",
  "kancelaria",
  "realitný maklér",
  "realitny makler",
  "realitná maklérka",
  "realitna maklerka",
  "reb.sk",
  "re/max",
  "remax",
  "tureality",
  "haloreality",
  "halo reality",
  "v zastúpení majiteľa",
  "v zastupeni majitela",
  "v exkluzívnom zastúpení",
  "v exkluzivnom zastupeni",
  "exkluzívny",
  "exkluzivny",
  "rezidencia",
  "prémiové bývanie",
  "premiove byvanie",
  "apartmány",
  "apartmany",
  "pripravujeme do ponuky",
  "dražba",
  "drazba",
  "na kľúč",
  "na kluc",
  "posledný",
  "posledny",
];

const outOfMarketSignals = [
  "v česku",
  "v cesku",
  "česko",
  "cesko",
  "radvaň nad dunajom",
  "radvan nad dunajom",
  "gemer",
  "ostrov na gemeri",
];

const strongOwnerSignals = [
  "predám",
  "predam",
  "majiteľ",
  "majitel",
  "bez provízie",
  "bez provizie",
  "bez rk",
  "realitky ne",
  "nie som rk",
];

const auditRow = (row, source) => {
  const titleText = normalize(row.listing_title);
  const fullText = normalize(
    [
      row.listing_title,
      row.location,
      row.reason_for_grade,
      row.reason,
      row.signal,
      row.notes,
      row.first_observation,
      row.second_observation,
      row.third_observation,
    ].join(" "),
  );
  const issues = [];
  const ownerSignal = hasAny(fullText, strongOwnerSignals);

  if (hasAny(titleText, buyerDemandSignals) || hasAny(fullText, buyerDemandSignals)) {
    issues.push("buyer_demand_signal");
  }

  if (hasAny(fullText, brokerDeveloperSignals)) {
    issues.push("broker_or_developer_signal");
  }

  if (hasAny(fullText, outOfMarketSignals)) {
    issues.push("out_of_market_signal");
  }

  if (source !== "active" && !ownerSignal && row.ai_grade === "A") {
    issues.push("a_grade_without_explicit_owner_signal");
  }

  return {
    source,
    candidate_id: row.candidate_id,
    ai_grade: row.ai_grade || "",
    status: row.status || "",
    listing_title: row.listing_title || "",
    location: row.location || "",
    source_url: row.source_url || "",
    issues,
  };
};

const mainCandidates = readTable(paths.mainCandidates).filter((row) => row.candidate_id);
const expansionCandidates = readTable(paths.expansionCandidates).filter((row) => row.candidate_id);
const logRows = readTable(paths.log).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const mainByUrl = new Map(mainCandidates.map((row) => [row.source_url, row]));
const activeRows = logRows.map((row) => ({
  ...(mainByUrl.get(row.source_url) || {}),
  ...row,
  candidate_id: mainByUrl.get(row.source_url)?.candidate_id || row.candidate_id || "",
}));

const packFiles = readdirSync(paths.leadsDir)
  .filter((file) => /^manual-owner-hunting-source-import-pack-.+-\d{4}-\d{2}-\d{2}\.json$/.test(file))
  .sort();
const packRows = packFiles.flatMap((file) => {
  const pack = JSON.parse(readFileSync(join(paths.leadsDir, file), "utf8"));
  return (pack.rows || []).map((row) => ({ ...row, pack_file: file }));
});

const activeFindings = activeRows.map((row) => auditRow(row, "active")).filter((row) => row.issues.length);
const expansionFindings = expansionCandidates
  .map((row) => auditRow(row, "expansion"))
  .filter((row) => row.issues.length);
const packFindings = packRows.map((row) => auditRow(row, row.pack_file)).filter((row) => row.issues.length);

const activeErrors = activeFindings.filter((row) =>
  row.issues.some((issue) => issue !== "a_grade_without_explicit_owner_signal"),
);
const packErrors = packFindings.filter((row) =>
  row.issues.some((issue) => issue !== "a_grade_without_explicit_owner_signal"),
);
const errors = [
  ...activeErrors.map((row) => `${row.source}:${row.candidate_id} ${row.issues.join("|")} ${row.listing_title}`),
  ...packErrors.map((row) => `${row.source}:${row.candidate_id} ${row.issues.join("|")} ${row.listing_title}`),
];
const warnings = expansionFindings.map(
  (row) => `expansion:${row.candidate_id} ${row.issues.join("|")} ${row.listing_title}`,
);

const result = {
  ok: errors.length === 0,
  date: today,
  counts: {
    active_rows: activeRows.length,
    expansion_rows: expansionCandidates.length,
    source_pack_files: packFiles.length,
    source_pack_rows: packRows.length,
    active_findings: activeFindings.length,
    expansion_findings: expansionFindings.length,
    source_pack_findings: packFindings.length,
  },
  source_pack_files: packFiles,
  errors,
  warnings,
  findings: {
    active: activeFindings,
    expansion: expansionFindings,
    source_packs: packFindings,
  },
  outputs: {
    markdown: paths.markdown,
    json: paths.json,
  },
};

const findingTable = (rows) => {
  if (!rows.length) return "- none";
  const body = rows
    .slice(0, 80)
    .map((row) =>
      `| ${row.source} | ${row.candidate_id} | ${row.ai_grade} | ${row.status} | ${row.issues.join(", ")} | ${String(row.listing_title).replace(/\|/g, "\\|")} |`,
    )
    .join("\n");
  return `| Source | ID | Grade | Status | Issues | Title |\n|---|---|---:|---|---|---|\n${body}`;
};

const markdown = `# Manual owner hunting quality audit

Date: ${today}

Purpose: catch qualitative false positives that structural validators miss: buyer demand, broker/developer wording, out-of-market rows, and suspicious A grades without explicit owner signal.

## Result

\`\`\`json
${JSON.stringify({ ok: result.ok, counts: result.counts, errors: errors.length, warnings: warnings.length }, null, 2)}
\`\`\`

## Active Errors

${findingTable(activeErrors)}

## Source Pack Errors

${findingTable(packErrors)}

## Expansion Warnings

${findingTable(expansionFindings)}
`;

writeFileSync(paths.json, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(paths.markdown, markdown);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      counts: result.counts,
      errors: errors.length,
      warnings: warnings.length,
      markdown: paths.markdown,
      json: paths.json,
    },
    null,
    2,
  ),
);

if (!result.ok) {
  process.exit(1);
}
