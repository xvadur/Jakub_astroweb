import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const mainCandidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const expansionCandidatesPath = "ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const nextWavePath = "ops/leads/manual-owner-hunting-next-wave-2026-06-19.json";

const allowedStatuses = new Set(["ready_to_send", "not_fit"]);

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
  const records = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );

  return { headers, records };
};

const parseArgs = (args) => {
  const positional = [];
  const options = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [rawKey, ...rawValue] = arg.slice(2).split("=");
      options[rawKey] = rawValue.length ? rawValue.join("=") : "true";
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
};

const printUsageAndExit = () => {
  console.error(`Usage:
  npm run leads:manual-import-expansion -- HUNT-021 ready_to_send --follow-up=2026-06-24 --notes="live checked"
  npm run leads:manual-import-expansion -- HUNT-021 not_fit --notes="inactive on pre-send check"
  npm run leads:manual-import-expansion -- HUNT-021 ready_to_send --dry-run
  npm run leads:manual-import-expansion -- --from-next-wave
  npm run leads:manual-import-expansion -- --from-next-wave --apply

Allowed statuses:
  ${[...allowedStatuses].join(", ")}
`);
  process.exit(1);
};

const today = () => new Date().toISOString().slice(0, 10);

const buildLogRow = (candidate, status, options) => ({
  date: options.date || today(),
  source: candidate.source,
  source_url: candidate.source_url,
  listing_title: candidate.listing_title,
  suspected_owner_type: candidate.suspected_owner_type,
  property_type: candidate.property_type,
  location: candidate.location,
  asking_price: candidate.asking_price,
  public_contact: candidate.public_contact_path,
  signal: candidate.signal,
  ai_grade: candidate.ai_grade,
  reason_for_grade: candidate.reason_for_grade,
  first_observation: candidate.first_observation,
  second_observation: candidate.second_observation,
  third_observation: candidate.third_observation,
  outreach_channel: "platform",
  outreach_message_version: candidate.recommended_message_version || `${candidate.candidate_id}-expansion`,
  status,
  next_follow_up_at: options["follow-up"] || "",
  jakub_notified: options["jakub-notified"] || "no",
  crm_lead_id: options["crm-lead-id"] || "",
  notes: options.notes || "imported from expansion after live pre-send check",
});

const { positional, options } = parseArgs(process.argv.slice(2));
const [candidateId, status] = positional;

const fromNextWave = options["from-next-wave"] === "true";

if (!fromNextWave && (!candidateId || !status || !allowedStatuses.has(status))) {
  printUsageAndExit();
}

const { headers: mainHeaders, records: mainCandidates } = readTable(mainCandidatesPath);
const { records: expansionCandidates } = readTable(expansionCandidatesPath);
const { headers: logHeaders, records: logRows } = readTable(logPath);
const candidatesById = new Map(expansionCandidates.map((row) => [row.candidate_id, row]));

const importOne = (candidate, nextStatus, importOptions, currentMainCandidates, currentLogRows) => {
  const existsInMain = currentMainCandidates.some(
    (row) => row.candidate_id === candidate.candidate_id || row.source_url === candidate.source_url,
  );
  const existsInLog = currentLogRows.some((row) => row.source_url === candidate.source_url);

  return {
    candidate_id: candidate.candidate_id,
    status: nextStatus,
    added_to_main_candidates: !existsInMain,
    added_to_log: !existsInLog,
    candidate_row: existsInMain
      ? null
      : Object.fromEntries(mainHeaders.map((header) => [header, candidate[header] || ""])),
    log_row: existsInLog ? null : buildLogRow(candidate, nextStatus, importOptions),
  };
};

if (fromNextWave) {
  try {
    execFileSync("node", ["scripts/manual-hunting-validate-next-wave.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    console.error("Next-wave validation failed; refusing batch import.");
    if (error.stdout) console.error(String(error.stdout).trim());
    if (error.stderr) console.error(String(error.stderr).trim());
    process.exit(1);
  }

  const nextWave = JSON.parse(readFileSync(nextWavePath, "utf8"));
  const ids = nextWave.rows
    .filter((row) => row.decision === "import_ready" && row.candidate_id)
    .map((row) => row.candidate_id);
  const importOptions = {
    ...options,
    "follow-up": options["follow-up"] || "2026-06-24",
    notes: options.notes || "batch imported from next-wave import_ready after live preflight",
  };
  const plannedImports = [];
  const nextMainCandidates = [...mainCandidates];
  const nextLogRows = [...logRows];

  for (const id of ids) {
    const candidate = candidatesById.get(id);

    if (!candidate) {
      console.error(`Unknown expansion candidate_id from next wave: ${id}`);
      process.exit(1);
    }

    const planned = importOne(candidate, "ready_to_send", importOptions, nextMainCandidates, nextLogRows);
    plannedImports.push(planned);

    if (planned.candidate_row) nextMainCandidates.push(planned.candidate_row);
    if (planned.log_row) nextLogRows.push(planned.log_row);
  }

  const apply = options.apply === "true";

  if (apply) {
    writeFileSync(
      mainCandidatesPath,
      stringifyCsv([mainHeaders, ...nextMainCandidates.map((row) => mainHeaders.map((header) => row[header] || ""))]),
    );
    writeFileSync(
      logPath,
      stringifyCsv([logHeaders, ...nextLogRows.map((row) => logHeaders.map((header) => row[header] || ""))]),
    );
  }

  console.log(
    JSON.stringify(
      {
        mode: "from_next_wave",
        dry_run: !apply,
        next_wave_path: nextWavePath,
        import_ready_ids: ids,
        planned_imports: plannedImports.length,
        added_to_main_candidates: plannedImports.filter((row) => row.added_to_main_candidates).length,
        added_to_log: plannedImports.filter((row) => row.added_to_log).length,
        skipped_existing_main: plannedImports.filter((row) => !row.added_to_main_candidates).length,
        skipped_existing_log: plannedImports.filter((row) => !row.added_to_log).length,
        apply_command:
          "npm run leads:manual-import-expansion -- --from-next-wave --apply --follow-up=2026-06-24",
        main_candidates_path: mainCandidatesPath,
        log_path: logPath,
      },
      null,
      2,
    ),
  );

  process.exit(0);
}

const candidate = candidatesById.get(candidateId);

if (!candidate) {
  console.error(`Unknown expansion candidate_id: ${candidateId}`);
  process.exit(1);
}

const planned = importOne(candidate, status, options, mainCandidates, logRows);
const candidateRows = planned.candidate_row ? [...mainCandidates, planned.candidate_row] : mainCandidates;
const logRowsNext = planned.log_row ? [...logRows, planned.log_row] : logRows;

if (options["dry-run"] !== "true") {
  writeFileSync(
    mainCandidatesPath,
    stringifyCsv([mainHeaders, ...candidateRows.map((row) => mainHeaders.map((header) => row[header] || ""))]),
  );
  writeFileSync(logPath, stringifyCsv([logHeaders, ...logRowsNext.map((row) => logHeaders.map((header) => row[header] || ""))]));
}

console.log(
  JSON.stringify(
    {
      candidate_id: candidateId,
      dry_run: options["dry-run"] === "true",
      status,
      added_to_main_candidates: planned.added_to_main_candidates,
      added_to_log: planned.added_to_log,
      main_candidates_path: mainCandidatesPath,
      log_path: logPath,
    },
    null,
    2,
  ),
);
