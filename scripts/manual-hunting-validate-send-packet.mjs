import { readFileSync } from "node:fs";

const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const preflightPath = "ops/leads/manual-owner-hunting-live-preflight-2026-06-19.json";
const packetCsvPath = "ops/leads/manual-owner-hunting-send-packet-2026-06-19.csv";
const packetJsonPath = "ops/leads/manual-owner-hunting-send-packet-2026-06-19.json";
const sessionReportTemplatePath = "ops/leads/manual-owner-hunting-session-report-template-2026-06-19.txt";

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
  const headers = rows[0] || [];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const hasPrivateContact = (text) =>
  /\b09\d{2}[\s./-]?\d{3}[\s./-]?\d{3}\b/.test(text) ||
  /\b\+421[\s./-]?\d{3}[\s./-]?\d{3}[\s./-]?\d{3}\b/.test(text) ||
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);

const errors = [];
const warnings = [];
const logRows = readTable(logPath).filter((row) => row.source_url && row.status && !row.status.includes("|"));
const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const candidatesByUrl = new Map(candidates.map((row) => [row.source_url, row]));
const readyRows = logRows.filter((row) => row.status === "ready_to_send");
const preflight = JSON.parse(readFileSync(preflightPath, "utf8"));
const preflightById = new Map(preflight.results.map((row) => [row.candidate_id, row]));
const packetCsvRows = readTable(packetCsvPath);
const packetJson = JSON.parse(readFileSync(packetJsonPath, "utf8"));
const packetJsonRows = packetJson.queue || [];
const sessionReportTemplate = readFileSync(sessionReportTemplatePath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const readyIds = readyRows.map((row) => candidatesByUrl.get(row.source_url)?.candidate_id || "");
const csvIds = packetCsvRows.map((row) => row.candidate_id);
const jsonIds = packetJsonRows.map((row) => row.candidate_id);
const templateIds = sessionReportTemplate.map((line) => line.split("|")[0]?.trim() || "");

if (readyRows.length !== 10) errors.push(`Expected 10 ready_to_send rows, found ${readyRows.length}.`);
if (packetCsvRows.length !== readyRows.length) {
  errors.push(`CSV packet row count ${packetCsvRows.length} does not match ready queue ${readyRows.length}.`);
}
if (packetJsonRows.length !== readyRows.length) {
  errors.push(`JSON packet row count ${packetJsonRows.length} does not match ready queue ${readyRows.length}.`);
}

if (readyIds.join(",") !== csvIds.join(",")) {
  errors.push(`CSV packet IDs do not match ready queue. ready=${readyIds.join(",")} csv=${csvIds.join(",")}`);
}

if (readyIds.join(",") !== jsonIds.join(",")) {
  errors.push(`JSON packet IDs do not match ready queue. ready=${readyIds.join(",")} json=${jsonIds.join(",")}`);
}

if (readyIds.join(",") !== templateIds.join(",")) {
  errors.push(`Session report template IDs do not match ready queue. ready=${readyIds.join(",")} template=${templateIds.join(",")}`);
}

for (const line of sessionReportTemplate) {
  if (!/^HUNT-\d{3}\s+\|\s+open\s+\|/.test(line)) {
    errors.push(`Invalid session report template line: ${line}`);
  }
}

if (preflight.counts?.send_ok !== readyRows.length || preflight.counts?.do_not_send !== 0) {
  errors.push(
    `Live preflight is not clean: send_ok=${preflight.counts?.send_ok || 0}, do_not_send=${preflight.counts?.do_not_send || 0}.`,
  );
}

for (const row of packetCsvRows) {
  const preflightRow = preflightById.get(row.candidate_id);
  if (!preflightRow) errors.push(`${row.candidate_id}: missing preflight row.`);
  if (preflightRow && preflightRow.decision !== "send_ok") {
    errors.push(`${row.candidate_id}: preflight decision is ${preflightRow.decision}.`);
  }
  if (row.preflight_status !== "send_ok") errors.push(`${row.candidate_id}: packet preflight_status is ${row.preflight_status}.`);
  if (!row.first_message || row.first_message.length < 80) errors.push(`${row.candidate_id}: first_message is missing or too short.`);
  if (!row.session_report_sent.startsWith(`${row.candidate_id} | sent |`)) {
    errors.push(`${row.candidate_id}: invalid sent session report line.`);
  }
  if (!row.session_report_blocked.startsWith(`${row.candidate_id} | blocked |`)) {
    errors.push(`${row.candidate_id}: invalid blocked session report line.`);
  }
  if (hasPrivateContact([row.first_message, row.session_report_sent, row.session_report_blocked].join("\n"))) {
    errors.push(`${row.candidate_id}: packet contains phone/email-like private contact data.`);
  }
  if (row.source === "Bazoš" && !/Bazoš/i.test(row.session_report_sent)) {
    warnings.push(`${row.candidate_id}: Bazoš row session note does not mention Bazoš.`);
  }
  if (row.source === "Bezrealitky" && !/Bezrealitky/i.test(row.session_report_sent)) {
    warnings.push(`${row.candidate_id}: Bezrealitky row session note does not mention Bezrealitky.`);
  }
}

const result = {
  ok: errors.length === 0,
  ready_to_send: readyRows.length,
  packet_csv_rows: packetCsvRows.length,
  packet_json_rows: packetJsonRows.length,
  session_report_template_rows: sessionReportTemplate.length,
  preflight_send_ok: preflight.counts?.send_ok || 0,
  preflight_do_not_send: preflight.counts?.do_not_send || 0,
  ids: readyIds,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exitCode = 1;
}
