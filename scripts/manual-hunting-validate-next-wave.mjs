import { existsSync, readFileSync, writeFileSync } from "node:fs";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const paths = {
  nextWave: "ops/leads/manual-owner-hunting-next-wave-2026-06-19.json",
  expansionCandidates: "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv",
  log: "ops/leads/manual-owner-hunting-log-2026-06-19.csv",
  markdown: `ops/leads/manual-owner-hunting-next-wave-validate-${today}.md`,
  json: `ops/leads/manual-owner-hunting-next-wave-validate-${today}.json`,
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

const stopSignals = {
  buyer_demand: [
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
    "platba v hotovosti",
  ],
  broker_developer: [
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
    "pripravujeme do ponuky",
    "dražba",
    "drazba",
    "na kľúč",
    "na kluc",
    "posledný",
    "posledny",
  ],
  out_of_market: [
    "v česku",
    "v cesku",
    "česko",
    "cesko",
    "radvaň nad dunajom",
    "radvan nad dunajom",
    "gemer",
    "ostrov na gemeri",
  ],
};

const softSignals = {
  weak_owner_evidence: [
    "manual price check",
    "dohodou",
  ],
};

const nextWave = JSON.parse(readFileSync(paths.nextWave, "utf8"));
const expansionRows = readTable(paths.expansionCandidates);
const logRows = readTable(paths.log).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const expansionById = new Map(expansionRows.map((row) => [row.candidate_id, row]));
const loggedUrls = new Set(logRows.map((row) => row.source_url).filter(Boolean));
const rows = nextWave.rows || [];
const errors = [];
const warnings = [];
const auditedRows = [];

for (const row of rows) {
  const expansion = expansionById.get(row.candidate_id);
  const text = normalize(
    [
      row.listing_title,
      row.location,
      row.asking_price,
      row.reasons?.join(" "),
      expansion?.reason_for_grade,
      expansion?.signal,
      expansion?.notes,
      expansion?.first_observation,
      expansion?.second_observation,
      expansion?.third_observation,
    ].join(" "),
  );
  const rowErrors = [];
  const rowWarnings = [];

  if (!/^HUNT-\d{3,}$/.test(row.candidate_id || "")) {
    rowErrors.push("invalid_candidate_id");
  }

  if (!expansion) {
    rowErrors.push("missing_expansion_candidate");
  }

  if (row.decision === "import_ready" && !["A", "B"].includes(row.ai_grade || expansion?.ai_grade)) {
    rowErrors.push("import_ready_non_ab_grade");
  }

  if (row.decision === "import_ready" && loggedUrls.has(row.source_url)) {
    rowErrors.push("import_ready_already_in_active_log");
  }

  if (row.decision === "import_ready" && (!row.first_message || !row.audit_reply)) {
    rowErrors.push("import_ready_missing_message_or_audit_reply");
  }

  for (const [name, terms] of Object.entries(stopSignals)) {
    if (hasAny(text, terms)) rowErrors.push(name);
  }

  for (const [name, terms] of Object.entries(softSignals)) {
    if (hasAny(text, terms)) rowWarnings.push(name);
  }

  auditedRows.push({
    candidate_id: row.candidate_id,
    decision: row.decision,
    ai_grade: row.ai_grade || expansion?.ai_grade || "",
    listing_title: row.listing_title || "",
    location: row.location || "",
    source_url: row.source_url || "",
    errors: rowErrors,
    warnings: rowWarnings,
  });

  if (row.decision === "import_ready") {
    for (const error of rowErrors) {
      errors.push(`${row.candidate_id}: ${error} (${row.listing_title})`);
    }
  }

  for (const warning of rowWarnings) {
    warnings.push(`${row.candidate_id}: ${warning} (${row.listing_title})`);
  }
}

const importReadyRows = rows.filter((row) => row.decision === "import_ready");
if ((nextWave.counts?.import_ready || 0) !== importReadyRows.length) {
  errors.push(
    `counts.import_ready=${nextWave.counts?.import_ready || 0} does not match rows=${importReadyRows.length}`,
  );
}

const result = {
  ok: errors.length === 0,
  date: today,
  counts: {
    total: rows.length,
    import_ready: importReadyRows.length,
    manual_check: rows.filter((row) => row.decision === "manual_check").length,
    do_not_import: rows.filter((row) => row.decision === "do_not_import").length,
    row_errors: auditedRows.filter((row) => row.errors.length).length,
    row_warnings: auditedRows.filter((row) => row.warnings.length).length,
  },
  errors,
  warnings,
  rows: auditedRows,
  outputs: {
    markdown: paths.markdown,
    json: paths.json,
  },
};

const markdownRows = auditedRows.length
  ? auditedRows
      .map((row) => `| ${row.candidate_id} | ${row.decision} | ${row.ai_grade} | ${row.errors.join(", ") || "-"} | ${row.warnings.join(", ") || "-"} | ${String(row.listing_title).replace(/\|/g, "\\|")} |`)
      .join("\n")
  : "";

const markdown = `# Manual owner hunting next-wave validation

Date: ${today}

Purpose: block batch import from next-wave if an import-ready row has buyer, broker/developer, out-of-market, duplicate-log, or missing-message signals.

## Result

\`\`\`json
${JSON.stringify(
  {
    ok: result.ok,
    counts: result.counts,
    errors: errors.length,
    warnings: warnings.length,
  },
  null,
  2,
)}
\`\`\`

## Rows

| ID | Decision | Grade | Errors | Warnings | Title |
|---|---|---:|---|---|---|
${markdownRows}
`;

writeFileSync(paths.json, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(paths.markdown, markdown);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      counts: result.counts,
      errors,
      warnings,
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
