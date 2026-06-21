import { readFileSync, writeFileSync } from "node:fs";

const mainCandidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const expansionCandidatesPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";

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
const csvOutputPath = `ops/leads/manual-owner-hunting-source-scan${outputLabel}-${today}.csv`;
const markdownOutputPath = `ops/leads/manual-owner-hunting-source-scan${outputLabel}-${today}.md`;
const jsonOutputPath = `ops/leads/manual-owner-hunting-source-scan${outputLabel}-${today}.json`;
const offsetStep = Math.max(20, Number(args["offset-step"] || 20));
const offsetMax = Math.max(0, Number(args["offset-max"] || 100));
const detailLimit = Math.max(1, Number(args["detail-limit"] || 80));
const requestedTypes = new Set(
  String(args.types || "byt,dom,pozemok")
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean),
);

const sourceBases = [
  {
    source: "Bazoš",
    property_type_hint: "byt",
    base_url: "https://reality.bazos.sk/predam/byt",
  },
  {
    source: "Bazoš",
    property_type_hint: "dom",
    base_url: "https://reality.bazos.sk/predam/dom",
  },
  {
    source: "Bazoš",
    property_type_hint: "pozemok",
    base_url: "https://reality.bazos.sk/predam/pozemok",
  },
].filter((source) => requestedTypes.has(source.property_type_hint));
const sourceOffsets = Array.from(
  { length: Math.floor(offsetMax / offsetStep) + 1 },
  (_, index) => String(index * offsetStep),
);
const sourceUrls = sourceBases.flatMap((source) =>
  sourceOffsets.map((offset) => ({
    ...source,
    url: `${source.base_url}/${offset === "0" ? "" : `${offset}/`}`,
  })),
);

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

const stripTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const decodeHtml = (value) =>
  String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();

const scrubPersonalContact = (value) =>
  String(value || "")
    .replace(/\b09\d{2}[\s./-]?\d{3}[\s./-]?\d{3}\b/g, "[phone-redacted]")
    .replace(/\b\+421[\s./-]?\d{3}[\s./-]?\d{3}[\s./-]?\d{3}\b/g, "[phone-redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email-redacted]");

const absoluteUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `https://reality.bazos.sk${url.startsWith("/") ? "" : "/"}${url}`;
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 manual owner lead research",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
};

const parseBazosList = (html, source) =>
  html
    .split(/<div class="inzeraty inzeratyflex">/g)
    .slice(1)
    .map((block) => {
      const href = block.match(/<h2 class=nadpis><a href="([^"]+)">/i)?.[1] || "";
      const title = decodeHtml(stripTags(block.match(/<h2 class=nadpis>[\s\S]*?<\/h2>/i)?.[0] || ""));
      const price = decodeHtml(stripTags(block.match(/<div class="inzeratycena">[\s\S]*?<\/div>/i)?.[0] || ""));
      const location = decodeHtml(stripTags(block.match(/<div class="inzeratylok">[\s\S]*?<\/div>/i)?.[0] || ""));
      const date = decodeHtml(block.match(/\[(\d{1,2}\.\d{1,2}\.\s*\d{4})\]/)?.[1] || "");
      const text = decodeHtml(stripTags(block));

      return {
        scan_date: today,
        source: source.source,
        property_type_hint: source.property_type_hint,
        source_list_url: source.url,
        source_url: absoluteUrl(href),
        listing_title: title,
        asking_price: price,
        location,
        listing_date: date,
        list_text: text,
      };
    })
    .filter((row) => row.source_url && row.listing_title);

const parseBazosDetailText = (html) => {
  const description = decodeHtml(stripTags(html.match(/<div class=popisdetail>([\s\S]*?)<\/div>/i)?.[1] || ""));
  const contactMarkers = [html.includes("Telefón:"), html.includes("Meno:")]
    .map((match, index) => (match ? ["telefon_marker", "meno_marker"][index] : ""))
    .filter(Boolean)
    .join(" ");

  return scrubPersonalContact(`${description} ${contactMarkers}`.trim());
};

const ownerSignals = [
  "predám",
  "predam",
  "majiteľ",
  "majitel",
  "bez rk",
  "rk ne",
  "realitky ne",
  "súkrom",
  "sukrom",
  "nie som rk",
];

const brokerSignals = [
  "ponúkame",
  "ponukame",
  "pripravujeme do ponuky",
  "ponúka na predaj",
  "ponuka na predaj",
  "v zastúpení majiteľa",
  "v zastupeni majitela",
  "zastúpení majiteľa",
  "zastupeni majitela",
  "v exkluzívnom zastúpení",
  "v exkluzivnom zastupeni",
  "exkluzívny",
  "exkluzivny",
  "realitná",
  "realitna",
  "realitný",
  "realitny",
  "realitnej kancelárie",
  "realitnej kancelarie",
  "rk ",
  "exkluzívne",
  "exkluzivne",
  "maklér",
  "makler",
  "kancelária",
  "kancelaria",
  "tureality",
  "re/max",
  "remax",
  "neoreal",
  "arvin",
  "haloreality",
  "halo reality",
  "reb.sk",
  "rezidencia",
  "prémiové bývanie",
  "premiove byvanie",
  "apartmány",
  "apartmany",
];

const buyerDemandSignals = [
  "hľadám",
  "hladam",
  "hľadame",
  "hladame",
  "máme záujem o kúpu",
  "mame zaujem o kupu",
  "mám záujem o kúpu",
  "mam zaujem o kupu",
  "kúpim byt",
  "kupim byt",
  "kúpim dom",
  "kupim dom",
  "kúpime byt",
  "kupime byt",
  "kúpime dom",
  "kupime dom",
  "hľadáme byt",
  "hladame byt",
  "hľadáme dom",
  "hladame dom",
  "za ponuky ďakujeme",
  "za ponuky dakujeme",
  "ponuky prosím",
  "ponuky prosim",
  "platba v hotovosti",
];

const buyerDemandTitleSignals = [
  "hľadám",
  "hladam",
  "hľadame",
  "hladame",
  "kúpim",
  "kupim",
  "kúpime",
  "kupime",
];

const outOfMarketSignals = [
  "v česku",
  "v cesku",
  "česko",
  "cesko",
  "radvaň nad dunajom",
  "radvan nad dunajom",
  "gemeri",
  "gemer",
  "ostrov na gemeri",
];

const nonOwnerSaleSignals = [
  "dražba",
  "drazba",
  "na kľúč",
  "na kluc",
  "posledný",
  "posledny",
  "kompletne dokončený",
  "kompletne dokonceny",
];

const marketLocationSignals = ["bratislava", "senec", "pezinok", "malacky"];
const marketTitleSignals = [
  "bratislava",
  "petržalka",
  "petrzalka",
  "ružinov",
  "ruzinov",
  "rača",
  "raca",
  "karlova ves",
  "dúbravka",
  "dubravka",
  "vrakuňa",
  "vrakuna",
  "lamač",
  "lamac",
  "devínska",
  "devinska",
  "záhorská bystrica",
  "zahorska bystrica",
  "stupava",
  "chorvátsky grob",
  "chorvatsky grob",
  "miloslavov",
  "bernolákovo",
  "bernolakovo",
  "ivanka pri dunaji",
  "most pri bratislave",
  "rovinka",
  "dunajská lužná",
  "dunajska luzna",
  "senec",
  "pezinok",
  "malacky",
];

const includesAny = (text, needles) => needles.some((needle) => text.includes(needle));

const isMarketMatch = (row) => {
  const location = String(row.location || "").toLowerCase();
  const title = String(row.listing_title || "").toLowerCase();

  if (includesAny(location, marketLocationSignals)) return true;
  return includesAny(title, marketTitleSignals) && includesAny(location, marketLocationSignals);
};

const parseEuroAmount = (value) => {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
  const match = normalized.match(/(\d[\d\s.]*(?:,\d+)?)(?=\s*€)/);
  if (!match) return null;

  const amount = Number(match[1].replaceAll(" ", "").replaceAll(".", "").replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
};

const parseAreaM2 = (text) => {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .toLowerCase();
  const matches = [...normalized.matchAll(/(\d{2,6}(?:[,.]\d+)?)\s*(?:m2|m²|m 2)/g)]
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((value) => Number.isFinite(value));

  return matches.length ? Math.max(...matches) : null;
};

const hasPricePerM2Signal = (text) => {
  const normalized = String(text || "").toLowerCase();
  return /(?:€|eur|euro)\s*\/\s*m\s*2/.test(normalized) || /(?:€|eur|euro)\s*\/\s*m²/.test(normalized);
};

const assessDealFit = (row, detailText = "") => {
  const combined = `${row.asking_price} ${row.listing_title} ${row.location} ${row.list_text} ${detailText}`.toLowerCase();
  const amount = parseEuroAmount(row.asking_price);
  const areaM2 = parseAreaM2(combined);
  const pricePerM2 = hasPricePerM2Signal(combined);
  const isLand = row.property_type_hint === "pozemok";
  const inBratislava = combined.includes("bratislava");

  const reasons = [];
  let deal_fit = "viable";

  const plausibleLandUnitPrice = amount !== null && amount < 2000;

  if (amount === null) {
    deal_fit = "unclear";
    reasons.push("price_unknown");
  } else if (isLand && pricePerM2 && plausibleLandUnitPrice) {
    const estimatedTotal = areaM2 ? Math.round(amount * areaM2) : null;
    if (estimatedTotal !== null && estimatedTotal >= 120000) {
      deal_fit = inBratislava ? "viable" : "unclear";
      reasons.push(`estimated_land_value_${estimatedTotal}`);
    } else {
      deal_fit = "low";
      reasons.push("land_price_per_m2_or_small_unit_price");
      if (estimatedTotal !== null) reasons.push(`estimated_land_value_${estimatedTotal}`);
    }
  } else if (isLand && amount < 120000) {
    deal_fit = "low";
    reasons.push("land_total_price_below_120k");
  } else if (!isLand && amount < 150000) {
    deal_fit = "low";
    reasons.push("residential_price_below_150k");
  }

  if (isLand && deal_fit === "unclear" && inBratislava) {
    reasons.push("bratislava_land_unknown_value");
  }

  return {
    deal_fit,
    deal_fit_reason: reasons.join("|") || "price_and_asset_type_fit",
  };
};

const classify = (row, detailText = "") => {
  const combined = `${row.listing_title} ${row.location} ${row.list_text} ${detailText}`.toLowerCase();
  const title = String(row.listing_title || "").toLowerCase();
  const inMarket = isMarketMatch(row);
  const ownerSignal = includesAny(combined, ownerSignals);
  const brokerSignal = includesAny(combined, brokerSignals);
  const buyerDemandSignal = includesAny(combined, buyerDemandSignals);
  const buyerDemandTitleSignal = includesAny(title, buyerDemandTitleSignals);
  const outOfMarketSignal = includesAny(combined, outOfMarketSignals);
  const nonOwnerSaleSignal = includesAny(combined, nonOwnerSaleSignals);
  const activeSignal = combined.includes("meno_marker") || combined.includes("telefon_marker");
  const detailThin = detailText.length < 400;
  const dealFit = assessDealFit(row, detailText);

  let review_priority = "C";
  if (inMarket && ownerSignal && !brokerSignal) review_priority = "A";
  else if (inMarket && !brokerSignal) review_priority = "B";

  if (dealFit.deal_fit === "low") review_priority = "C";
  if (buyerDemandSignal || buyerDemandTitleSignal || outOfMarketSignal || nonOwnerSaleSignal) {
    review_priority = "C";
  }

  const reasons = [];
  if (inMarket) reasons.push("market_match");
  if (ownerSignal) reasons.push("owner_signal");
  if (brokerSignal) reasons.push("broker_signal");
  if (buyerDemandSignal) reasons.push("buyer_demand_signal");
  if (buyerDemandTitleSignal) reasons.push("buyer_demand_title_signal");
  if (outOfMarketSignal) reasons.push("out_of_market_signal");
  if (nonOwnerSaleSignal) reasons.push("non_owner_sale_signal");
  if (activeSignal) reasons.push("active_contact_marker");
  if (detailThin) reasons.push("thin_detail_text");
  reasons.push(`deal_fit_${dealFit.deal_fit}`);
  reasons.push(dealFit.deal_fit_reason);

  return {
    review_priority,
    deal_fit: dealFit.deal_fit,
    deal_fit_reason: dealFit.deal_fit_reason,
    reason: reasons.join("|") || "weak_match",
  };
};

const existingRows = [
  ...readTable(mainCandidatesPath),
  ...readTable(expansionCandidatesPath),
  ...readTable(logPath),
].filter((row) => row.source_url);
const existingUrls = new Set(existingRows.map((row) => row.source_url));

const rawRows = [];

for (const source of sourceUrls) {
  try {
    const html = await fetchText(source.url);
    rawRows.push(...parseBazosList(html, source));
  } catch (error) {
    rawRows.push({
      scan_date: today,
      source: source.source,
      property_type_hint: source.property_type_hint,
      source_list_url: source.url,
      source_url: "",
      listing_title: "SOURCE_FETCH_FAILED",
      asking_price: "",
      location: "",
      listing_date: "",
      list_text: String(error.message || error),
    });
  }
}

const uniqueRows = [];
const seen = new Set();
for (const row of rawRows) {
  if (!row.source_url || seen.has(row.source_url)) continue;
  seen.add(row.source_url);
  uniqueRows.push(row);
}

const locationPrefilteredRows = uniqueRows.filter((row) => {
  return existingUrls.has(row.source_url) || isMarketMatch(row);
});
const limitedRows = locationPrefilteredRows.slice(0, detailLimit);
const detailTexts = new Map();

for (const row of limitedRows) {
  try {
    const html = await fetchText(row.source_url);
    detailTexts.set(row.source_url, parseBazosDetailText(html).slice(0, 4000));
  } catch {
    detailTexts.set(row.source_url, "");
  }
}

const scanRows = limitedRows
  .map((row) => {
    const duplicate = existingUrls.has(row.source_url);
    const detailText = detailTexts.get(row.source_url) || "";
    const classification = classify(row, detailText);

    return {
      ...row,
      duplicate_existing: duplicate ? "yes" : "no",
      review_priority: duplicate ? "duplicate" : classification.review_priority,
      deal_fit: classification.deal_fit,
      deal_fit_reason: classification.deal_fit_reason,
      reason: duplicate ? "already_in_pipeline" : classification.reason,
      detail_excerpt: detailText.slice(0, 500),
    };
  })
  .filter((row) => row.review_priority !== "C" || row.duplicate_existing === "yes")
  .sort((a, b) => {
    const rank = { A: 0, B: 1, duplicate: 2, C: 3 };
    return (rank[a.review_priority] ?? 9) - (rank[b.review_priority] ?? 9);
  });

const csvRows = [
  [
    "scan_date",
    "source",
    "property_type_hint",
    "source_list_url",
    "source_url",
    "listing_title",
    "asking_price",
    "location",
    "listing_date",
    "duplicate_existing",
    "review_priority",
    "deal_fit",
    "deal_fit_reason",
    "reason",
    "detail_excerpt",
  ],
  ...scanRows.map((row) => [
    row.scan_date,
    row.source,
    row.property_type_hint,
    row.source_list_url,
    row.source_url,
    row.listing_title,
    row.asking_price,
    row.location,
    row.listing_date,
    row.duplicate_existing,
    row.review_priority,
    row.deal_fit,
    row.deal_fit_reason,
    row.reason,
    row.detail_excerpt,
  ]),
];

const priorityRows = scanRows.filter((row) => row.duplicate_existing === "no" && row.review_priority !== "C");
const summary = {
  scan_label: scanLabel || "default",
  source_types: sourceBases.map((source) => source.property_type_hint),
  source_url_count: sourceUrls.length,
  offset_max: offsetMax,
  offset_step: offsetStep,
  detail_limit: detailLimit,
  raw_unique_seen: uniqueRows.length,
  location_prefiltered: locationPrefilteredRows.length,
  scanned_with_detail: limitedRows.length,
  output_rows: scanRows.length,
  new_review_candidates: priorityRows.length,
  priority_counts: scanRows.reduce((counts, row) => {
    counts[row.review_priority] = (counts[row.review_priority] || 0) + 1;
    return counts;
  }, {}),
  output_paths: {
    csv: csvOutputPath,
    markdown: markdownOutputPath,
    json: jsonOutputPath,
  },
};

const markdownRows = priorityRows.length
  ? priorityRows
      .slice(0, 30)
      .map(
        (row, index) => `## ${index + 1}. ${row.review_priority} - ${row.listing_title}

- Source: ${row.source}
- Type: ${row.property_type_hint}
- Price: ${row.asking_price}
- Location: ${row.location}
- Date: ${row.listing_date}
- Deal fit: ${row.deal_fit} (${row.deal_fit_reason})
- Reason: ${row.reason}
- URL: ${row.source_url}

Review note: check if this is direct owner/private seller before importing to expansion.
`,
      )
      .join("\n")
  : "No new A/B review candidates found in this scan.";

const markdown = `# Manual owner hunting source scan

Date: ${today}

Purpose: live source scan for fresh owner/private-seller candidates. This is a review pool, not a send queue.

Sources scanned:

${sourceUrls.map((source) => `- ${source.property_type_hint}: ${source.url}`).join("\n")}

Summary:

\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\`

Rules:

- Do not send from this file directly.
- Open the detail URL and verify owner/private seller signal manually.
- Import only clear A/B candidates into expansion with a custom message draft.
- Do not store phone numbers or personal contact details in repo.

${markdownRows}
`;

writeFileSync(csvOutputPath, stringifyCsv(csvRows));
writeFileSync(markdownOutputPath, markdown);
writeFileSync(jsonOutputPath, `${JSON.stringify({ summary, rows: scanRows }, null, 2)}\n`);

console.log(
  JSON.stringify(
    summary,
    null,
    2,
  ),
);
