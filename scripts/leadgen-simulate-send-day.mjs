import { readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const sendPacketPath = "ops/leads/manual-owner-hunting-send-packet-2026-06-19.json";
const nextWavePath = "ops/leads/manual-owner-hunting-next-wave-2026-06-19.json";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const outputMarkdownPath = `ops/leadgen-send-day-simulation-${today}.md`;
const outputJsonPath = `ops/leadgen-send-day-simulation-${today}.json`;

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

const countStatuses = (rows) =>
  rows.reduce((counts, row) => {
    if (!row.source_url || !row.status || row.status.includes("|")) return counts;
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});

const candidateIdsFromRows = (rows) =>
  rows
    .filter((row) => row.source_url && row.status && !row.status.includes("|"))
    .map((row) => row.candidate_id || "")
    .filter(Boolean);

const clone = (value) => JSON.parse(JSON.stringify(value));

const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const candidatesByUrl = new Map(candidates.map((row) => [row.source_url, row]));
const candidatesById = new Map(candidates.map((row) => [row.candidate_id, row]));
const logRows = readTable(logPath).map((row) => {
  const candidate = candidatesByUrl.get(row.source_url);
  return { ...row, candidate_id: candidate?.candidate_id || "" };
});
const packet = JSON.parse(readFileSync(sendPacketPath, "utf8"));
const nextWave = JSON.parse(readFileSync(nextWavePath, "utf8"));
const currentReady = logRows.filter((row) => row.source_url && row.status === "ready_to_send");
const packetIds = packet.queue.map((row) => row.candidate_id);
const readyIds = candidateIdsFromRows(currentReady);
const errors = [];
const warnings = [];

if (currentReady.length !== 10) errors.push(`Expected current ready queue of 10, found ${currentReady.length}.`);
if (packet.queue.length !== currentReady.length) {
  errors.push(`Send packet size ${packet.queue.length} does not match ready queue ${currentReady.length}.`);
}
if (packetIds.join(",") !== readyIds.join(",")) {
  errors.push(`Send packet IDs do not match ready queue. ready=${readyIds.join(",")} packet=${packetIds.join(",")}`);
}
if (packet.preflight?.send_ok !== currentReady.length || packet.preflight?.do_not_send !== 0) {
  errors.push(
    `Packet preflight is not clean: send_ok=${packet.preflight?.send_ok || 0}, do_not_send=${packet.preflight?.do_not_send || 0}.`,
  );
}

const afterSendRows = clone(logRows).map((row) => {
  if (!packetIds.includes(row.candidate_id)) return row;
  return {
    ...row,
    status: "contacted",
    next_follow_up_at: row.next_follow_up_at || "2026-06-22",
    notes: row.notes
      ? `${row.notes} | simulation: would be marked contacted after manual send`
      : "simulation: would be marked contacted after manual send",
  };
});

const importReadyRows = nextWave.rows.filter((row) => row.decision === "import_ready");
const importReadyIds = importReadyRows.map((row) => row.candidate_id);
const blockedNextWaveIds = nextWave.rows.filter((row) => row.decision !== "import_ready").map((row) => row.candidate_id);
const existingUrlsAfterSend = new Set(afterSendRows.map((row) => row.source_url).filter(Boolean));
const refillRows = importReadyRows.filter((row) => !existingUrlsAfterSend.has(row.source_url));

if (importReadyRows.length !== 10) errors.push(`Expected 10 import_ready next-wave rows, found ${importReadyRows.length}.`);
if (blockedNextWaveIds.length) {
  warnings.push(`Next-wave has ${blockedNextWaveIds.length} blocked/manual rows: ${blockedNextWaveIds.join(", ")}.`);
}
if (refillRows.length !== 10) {
  errors.push(`Expected 10 refill rows after simulated send, found ${refillRows.length}.`);
}

const afterRefillRows = [
  ...afterSendRows,
  ...refillRows.map((row) => {
    const candidate = candidatesById.get(row.candidate_id) || {};
    return {
      date: today,
      candidate_id: row.candidate_id,
      source: row.source,
      source_url: row.source_url,
      listing_title: row.listing_title,
      suspected_owner_type: candidate.suspected_owner_type || "",
      property_type: row.property_type,
      location: row.location,
      asking_price: row.asking_price,
      public_contact: candidate.public_contact_path || candidate.public_contact || "",
      signal: candidate.signal || "selling_without_agency",
      ai_grade: row.ai_grade,
      reason_for_grade: candidate.reason_for_grade || "",
      first_observation: candidate.first_observation || "",
      second_observation: candidate.second_observation || "",
      third_observation: candidate.third_observation || "",
      outreach_channel: "platform",
      outreach_message_version: `${row.candidate_id}-expansion`,
      status: "ready_to_send",
      next_follow_up_at: "2026-06-24",
      jakub_notified: "no",
      crm_lead_id: "",
      notes: "simulation: would be imported from next-wave import_ready after live preflight",
    };
  }),
];

const beforeCounts = countStatuses(logRows);
const afterSendCounts = countStatuses(afterSendRows);
const afterRefillCounts = countStatuses(afterRefillRows);
const contactedAfterSend = afterSendCounts.contacted || 0;
const readyAfterSend = afterSendCounts.ready_to_send || 0;
const readyAfterRefill = afterRefillCounts.ready_to_send || 0;
const contactedAfterRefill = afterRefillCounts.contacted || 0;
const expectedDailyContactCapacity = contactedAfterSend - (beforeCounts.contacted || 0);

if (readyAfterSend !== 0) errors.push(`Expected ready_to_send to be 0 after simulated send, found ${readyAfterSend}.`);
if (expectedDailyContactCapacity !== 10) {
  errors.push(`Expected +10 contacted after simulated send, found +${expectedDailyContactCapacity}.`);
}
if (readyAfterRefill !== 10) errors.push(`Expected 10 ready_to_send after refill, found ${readyAfterRefill}.`);
if (contactedAfterRefill !== contactedAfterSend) {
  errors.push("Refill simulation changed contacted count; it should only add ready_to_send rows.");
}

const result = {
  ok: errors.length === 0,
  date: today,
  before: beforeCounts,
  after_send_all_packet_rows: afterSendCounts,
  after_refill_next_wave: afterRefillCounts,
  sent_ids: packetIds,
  next_wave_import_ready_ids: importReadyIds,
  next_wave_blocked_ids: blockedNextWaveIds,
  expected_daily_contact_capacity: expectedDailyContactCapacity,
  expected_ready_after_refill: readyAfterRefill,
  commands: {
    pre_send_gate:
      "npm run leads:manual-live-preflight && npm run leads:manual-send-session && npm run leads:manual-validate-send-packet",
    apply_session_report:
      'tmpfile=$(mktemp) && pbpaste > "$tmpfile" && npm run leads:manual-apply-session-report -- --report="$tmpfile" && npm run leads:manual-apply-session-report -- --report="$tmpfile" --apply && rm "$tmpfile"',
    post_send_refresh: "npm run leadgen:post-send-refresh",
    refill_after_empty_queue: "npm run leadgen:post-send-refresh -- --apply-next-wave",
  },
  warnings,
  errors,
  outputs: {
    markdown: outputMarkdownPath,
    json: outputJsonPath,
  },
};

const markdown = `# Leadgen send day simulation

Date: ${today}

Purpose: prove the first manual send day path without mutating the lead log.

## Result

\`\`\`json
${JSON.stringify(
  {
    ok: result.ok,
    before: beforeCounts,
    after_send_all_packet_rows: afterSendCounts,
    after_refill_next_wave: afterRefillCounts,
    expected_daily_contact_capacity: expectedDailyContactCapacity,
    expected_ready_after_refill: readyAfterRefill,
  },
  null,
  2,
)}
\`\`\`

## IDs

- Sent if all current packet rows are manually sent: ${packetIds.join(", ")}
- Imported after refill: ${importReadyIds.join(", ")}
- Blocked from refill: ${blockedNextWaveIds.join(", ")}

## Commands

\`\`\`bash
${result.commands.pre_send_gate}
${result.commands.apply_session_report}
${result.commands.post_send_refresh}
${result.commands.refill_after_empty_queue}
\`\`\`

## Warnings

${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- none"}

## Errors

${errors.length ? errors.map((error) => `- ${error}`).join("\n") : "- none"}

## Interpretation

If the 10 current messages are actually sent and the copied session report is applied, the queue should move from \`10 ready_to_send / 0 contacted\` to \`0 ready_to_send / 10 contacted\`. After the verified next-wave refill, the system should hold \`10 contacted / 10 ready_to_send\`, which is the first practical 20-touch operating day.
`;

writeFileSync(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      before: beforeCounts,
      after_send_all_packet_rows: afterSendCounts,
      after_refill_next_wave: afterRefillCounts,
      expected_daily_contact_capacity: expectedDailyContactCapacity,
      expected_ready_after_refill: readyAfterRefill,
      markdown: outputMarkdownPath,
      json: outputJsonPath,
      warnings,
      errors,
    },
    null,
    2,
  ),
);

if (errors.length > 0) {
  process.exitCode = 1;
}
