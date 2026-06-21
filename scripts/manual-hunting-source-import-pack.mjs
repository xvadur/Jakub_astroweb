import { existsSync, readFileSync, writeFileSync } from "node:fs";

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

const sanitizeLabel = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const args = parseArgs(process.argv.slice(2));
const label = sanitizeLabel(args.label || "deep");
const outputLabel = label ? `-${label}` : "";

const paths = {
  mainCandidates: "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv",
  expansionCandidates: "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv",
  log: "ops/leads/manual-owner-hunting-log-2026-06-19.csv",
  sourceScanJson:
    args.scan || `ops/leads/manual-owner-hunting-source-scan${outputLabel}-${today}.json`,
  packCsv: `ops/leads/manual-owner-hunting-source-import-pack${outputLabel}-${today}.csv`,
  packMarkdown: `ops/leads/manual-owner-hunting-source-import-pack${outputLabel}-${today}.md`,
  packJson: `ops/leads/manual-owner-hunting-source-import-pack${outputLabel}-${today}.json`,
  messagesMarkdown: `ops/leads/manual-owner-hunting-source-import-messages${outputLabel}-${today}.md`,
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
  if (!existsSync(path)) return { headers: [], records: [] };
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0] || [];
  const records = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );

  return { headers, records };
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const extractHuntNumber = (candidateId) => {
  const match = String(candidateId || "").match(/^HUNT-(\d{3,})$/);
  return match ? Number(match[1]) : 0;
};

const shortLocation = (row) =>
  String(row.location || "")
    .replace(/\s*\d{3}\s*\d{2}\s*$/, "")
    .replace(/\s+/g, " ")
    .trim() || "Bratislava / okolie";

const propertyLabel = (row) => {
  const type = row.property_type_hint || "";
  const title = normalize(row.listing_title);

  if (type === "pozemok") return "pozemok";
  if (type === "dom") return "rodinný dom";
  if (title.includes("garzon")) return "garsónka";
  if (title.includes("1-izb") || title.includes("1 izb")) return "1-izbový byt";
  if (title.includes("2-izb") || title.includes("2 izb")) return "2-izbový byt";
  if (title.includes("3-izb") || title.includes("3 izb")) return "3-izbový byt";
  return type === "byt" ? "byt" : type || "nehnuteľnosť";
};

const suspectOwnerType = (row) => {
  const reason = normalize(row.reason);
  const detail = normalize(row.detail_excerpt);
  if (detail.includes("som majitel") || reason.includes("owner_signal")) return "private_seller_signal";
  return "unclear_private_seller";
};

const firstObservation = (row) => {
  const property = propertyLabel(row);
  const location = shortLocation(row);
  const price = row.asking_price || "bez jasnej ceny";
  return `${property} v lokalite ${location} s cenou ${price} potrebuje rychlo dokazat, preco je hodnota primerana oproti podobnym ponukam.`;
};

const secondObservation = (row) => {
  const normalized = normalize(`${row.listing_title} ${row.detail_excerpt}`);
  if (row.property_type_hint === "pozemok") {
    return "Pri pozemku rozhoduje jasny pribeh: vyuzitelnost, pristup, siete, regulacia a realny typ kupujuceho.";
  }

  if (row.property_type_hint === "dom") {
    return "Pri dome treba kupujucemu vysvetlit stav, pozemok, dostupnost, prevadzkove naklady a rodinny scenar.";
  }

  if (normalized.includes("parkovan") || normalized.includes("garaz")) {
    return "Parkovanie alebo garaz treba ukazat ako sucast celkovej hodnoty, nie ako doplnkovu poznamku.";
  }

  if (normalized.includes("rekonstruk")) {
    return "Rekonstrukcia musi byt dokazatelna fotkami, dispoziciou a detailmi, inak ju kupujuci zapocita iba ciastocne.";
  }

  return "Kupujuci musi hned pochopit dispoziciu, stav, mikrolokalitu a dovod ceny.";
};

const thirdObservation = (row) => {
  const location = normalize(row.location);
  if (location.includes("malacky") || location.includes("pezinok") || location.includes("senec")) {
    return "Pri Bratislavskom okoli treba predat aj dochadzanie, obciansku vybavenost a alternativu voci drahsej Bratislave.";
  }

  if (location.includes("bratislava")) {
    return "Pri Bratislave treba byt konkretnejsi nez nazov mestskej casti: kupujuceho zaujima mikrolokalita, hluk, parkovanie a dostupnost.";
  }

  return "Najvacsie riziko je genericky text, ktory neodlisi ponuku od podobnych inzeratov.";
};

const firstMessage = (row) => {
  const property = propertyLabel(row);
  const location = shortLocation(row);
  return `Dobrý deň, videl som Vašu ponuku: ${property} - ${location}. Pri takomto type nehnuteľnosti podľa mňa rozhoduje, či kupujúci hneď pochopí hodnotu, cieľového kupujúceho a dôvod ceny.

S Jakubom Olšom robíme krátke predajné audity pre majiteľov. Ak chcete, pošlem 3 konkrétne postrehy k tomu, ako môže ponuka pôsobiť na kupujúceho.`;
};

const auditReply = (row) =>
  `Tri veci, ktoré by som pozrel: 1. ${firstObservation(row)} 2. ${secondObservation(row)} 3. ${thirdObservation(row)} Ak chcete, Jakub vie spraviť konkrétnejšie porovnanie voči aktuálnym ponukám.`;

const hardStopSignals = [
  "buyer_demand_signal",
  "broker_signal",
  "deal_fit_low",
  "already_in_pipeline",
];

const scanData = JSON.parse(readFileSync(paths.sourceScanJson, "utf8"));
const { headers: expansionHeaders, records: expansionRows } = readTable(paths.expansionCandidates);
const { records: mainRows } = readTable(paths.mainCandidates);
const { records: logRows } = readTable(paths.log);
const existingIds = [...expansionRows, ...mainRows].map((row) => extractHuntNumber(row.candidate_id));
const nextStartId = Math.max(0, ...existingIds) + 1;
const existingUrls = new Set(
  [...expansionRows, ...mainRows, ...logRows].map((row) => row.source_url).filter(Boolean),
);

const sourceRows = (scanData.rows || [])
  .filter((row) => row.duplicate_existing === "no")
  .filter((row) => row.review_priority === "A" || row.review_priority === "B")
  .filter((row) => !existingUrls.has(row.source_url))
  .filter((row) => !hardStopSignals.some((signal) => String(row.reason || "").includes(signal)))
  .sort((a, b) => {
    const rank = { A: 0, B: 1 };
    return (rank[a.review_priority] ?? 9) - (rank[b.review_priority] ?? 9) || a.listing_title.localeCompare(b.listing_title);
  });

const candidateRows = sourceRows.map((row, index) => {
  const candidateId = `HUNT-${String(nextStartId + index).padStart(3, "0")}`;

  return {
    review_date: today,
    candidate_id: candidateId,
    source: row.source,
    source_url: row.source_url,
    listing_title: row.listing_title,
    suspected_owner_type: suspectOwnerType(row),
    property_type: propertyLabel(row),
    location: shortLocation(row),
    asking_price: row.asking_price,
    public_contact_path: "Bazoš platform contact / phone reveal, do not store contact in repo",
    signal: "source_scan_deep",
    ai_grade: row.review_priority,
    reason_for_grade: row.reason,
    first_observation: firstObservation(row),
    second_observation: secondObservation(row),
    third_observation: thirdObservation(row),
    recommended_message_version: `${candidateId}-source-scan`,
    status: "reviewed_not_contacted",
    notes: `Source import pack ${today}; open live detail and verify owner/private seller before append/import. Deal fit: ${row.deal_fit || "unknown"} (${row.deal_fit_reason || ""}).`,
  };
});

const csvHeaders = expansionHeaders.length
  ? expansionHeaders
  : [
      "review_date",
      "candidate_id",
      "source",
      "source_url",
      "listing_title",
      "suspected_owner_type",
      "property_type",
      "location",
      "asking_price",
      "public_contact_path",
      "signal",
      "ai_grade",
      "reason_for_grade",
      "first_observation",
      "second_observation",
      "third_observation",
      "recommended_message_version",
      "status",
      "notes",
    ];

const messageSections = candidateRows
  .map((row) => {
    const scanRow = sourceRows.find((item) => item.source_url === row.source_url);
    return `## ${row.candidate_id} ${row.location}

\`\`\`text
${firstMessage(scanRow)}
\`\`\`

Audit reply:

\`\`\`text
${auditReply(scanRow)}
\`\`\`
`;
  })
  .join("\n");

const markdownRows = candidateRows.length
  ? candidateRows
      .map(
        (row, index) => `## ${index + 1}. ${row.candidate_id} - ${row.listing_title}

- Source: ${row.source}
- Grade: ${row.ai_grade}
- Type: ${row.property_type}
- Location: ${row.location}
- Price: ${row.asking_price}
- URL: ${row.source_url}
- Append status: ${row.status}

First message:

\`\`\`text
${firstMessage(sourceRows[index])}
\`\`\`
`,
      )
      .join("\n")
  : "No append-ready source candidates after filters.";

const result = {
  date: today,
  label,
  source_scan_json: paths.sourceScanJson,
  source_scan_summary: scanData.summary || {},
  existing_max_hunt_id: Math.max(0, ...existingIds),
  next_start_id: `HUNT-${String(nextStartId).padStart(3, "0")}`,
  source_rows_after_filters: sourceRows.length,
  candidate_rows: candidateRows.length,
  outputs: {
    csv: paths.packCsv,
    markdown: paths.packMarkdown,
    json: paths.packJson,
    messages_markdown: paths.messagesMarkdown,
  },
};

const markdown = `# Manual owner hunting source import pack

Date: ${today}

Purpose: append-ready candidates generated from source scan. This file does not mutate the active pipeline.

Summary:

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`

Rules:

- Do not send from this pack directly.
- Open each live listing before appending to expansion.
- Append only rows that still look like owner/private seller listings.
- Do not store phone numbers, emails, or hidden contact details in repo.
- After appending, regenerate next wave and live preflight.

Append CSV: \`${paths.packCsv}\`
Messages: \`${paths.messagesMarkdown}\`

${markdownRows}
`;

const messagesMarkdown = `# Manual owner hunting source import messages

Date: ${today}

Purpose: first-message and audit-reply drafts for source-import candidates ${result.next_start_id} onward.

Use rule: do not send until each candidate is appended to expansion, live checked, imported to ready_to_send, and active send queue is handled.

${messageSections || "No messages generated."}
`;

writeFileSync(paths.packCsv, stringifyCsv([csvHeaders, ...candidateRows.map((row) => csvHeaders.map((header) => row[header] || ""))]));
writeFileSync(paths.packJson, `${JSON.stringify({ summary: result, rows: candidateRows }, null, 2)}\n`);
writeFileSync(paths.packMarkdown, markdown);
writeFileSync(paths.messagesMarkdown, messagesMarkdown);

console.log(JSON.stringify(result, null, 2));
