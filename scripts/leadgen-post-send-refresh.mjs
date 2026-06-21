import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";
const nextWavePath = "ops/leads/manual-owner-hunting-next-wave-2026-06-19.json";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const parseArgs = (args) => {
  const options = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rawValue] = arg.slice(2).split("=");
    options[rawKey] = rawValue.length ? rawValue.join("=") : "true";
  }

  return options;
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
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0] || [];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const statusCounts = () =>
  readTable(logPath)
    .filter((row) => row.source_url && row.status && !row.status.includes("|"))
    .reduce((counts, row) => {
      counts[row.status] = (counts[row.status] || 0) + 1;
      return counts;
    }, {});

const run = (label, command, args) => {
  const startedAt = Date.now();

  try {
    const stdout = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return {
      label,
      ok: true,
      ms: Date.now() - startedAt,
      command: [command, ...args].join(" "),
      stdout: stdout.trim().slice(-4000),
      error: "",
    };
  } catch (error) {
    return {
      label,
      ok: false,
      ms: Date.now() - startedAt,
      command: [command, ...args].join(" "),
      stdout: error.stdout ? String(error.stdout).trim().slice(-4000) : "",
      error: error.stderr ? String(error.stderr).trim().slice(-4000) : error.message,
    };
  }
};

const options = parseArgs(process.argv.slice(2));
const applyNextWave = options["apply-next-wave"] === "true";
const mode = applyNextWave ? "apply-next-wave" : "dry-run";
const outputMarkdownPath = `ops/leadgen-post-send-refresh-${mode}-${today}.md`;
const outputJsonPath = `ops/leadgen-post-send-refresh-${mode}-${today}.json`;
const before = statusCounts();
const nextWave = JSON.parse(readFileSync(nextWavePath, "utf8"));
const steps = [];
const decisions = [];

if ((before.ready_to_send || 0) > 0) {
  decisions.push(
    `${before.ready_to_send} rows are still ready_to_send. This is not a post-send state yet; do not import next wave.`,
  );
}

if (applyNextWave && (before.ready_to_send || 0) > 0) {
  decisions.push("--apply-next-wave refused because current ready_to_send queue is not empty.");
} else if (applyNextWave) {
  steps.push(
    run("import_next_wave_apply", "npm", [
      "run",
      "leads:manual-import-expansion",
      "--",
      "--from-next-wave",
      "--apply",
      "--follow-up=2026-06-24",
    ]),
  );
} else {
  steps.push(
    run("import_next_wave_dry_run", "npm", [
      "run",
      "leads:manual-import-expansion",
      "--",
      "--from-next-wave",
    ]),
  );
}

for (const [label, script] of [
  ["validate", "leads:manual-validate"],
  ["export_send_queue", "leads:manual-export"],
  ["send_session", "leads:manual-send-session"],
  ["validate_send_packet", "leads:manual-validate-send-packet"],
  ["followups", "leads:manual-followups"],
  ["handoff", "leads:manual-handoff"],
  ["next_wave", "leads:manual-next-wave"],
  ["command_center", "leads:manual-command-center"],
  ["daily_operator", "leadgen:daily-operator"],
  ["summary", "leads:manual-summary"],
]) {
  steps.push(run(label, "npm", ["run", script]));
}

const after = statusCounts();
const failures = steps.filter((step) => !step.ok);

if (!failures.length) {
  if ((after.ready_to_send || 0) > 0) {
    decisions.push(`Next operating action: send ${after.ready_to_send} ready_to_send messages.`);
  } else if ((nextWave.counts?.import_ready || 0) > 0) {
    decisions.push(
      `Next operating action: import next wave with npm run leadgen:post-send-refresh -- --apply-next-wave.`,
    );
  } else {
    decisions.push("Next operating action: source/review more owner candidates.");
  }
}

const state = {
  date: today,
  mode,
  apply_next_wave: applyNextWave,
  before,
  after,
  next_wave_import_ready: nextWave.counts?.import_ready || 0,
  ok: failures.length === 0,
  decisions,
  steps,
  outputs: {
    markdown: outputMarkdownPath,
    json: outputJsonPath,
  },
};

const markdown = `# Leadgen post-send refresh

Date: ${today}

Purpose: regenerate the operating system after a real manual send session and, only when explicitly requested, import the next verified wave.

## Status

\`\`\`json
${JSON.stringify(
  {
    ok: state.ok,
    apply_next_wave: applyNextWave,
    before,
    after,
    next_wave_import_ready: state.next_wave_import_ready,
  },
  null,
  2,
)}
\`\`\`

## Decisions

${decisions.map((decision) => `- ${decision}`).join("\n")}

## Steps

${steps
  .map(
    (step) => `### ${step.ok ? "OK" : "FAIL"} - ${step.label}

- Command: \`${step.command}\`
- Runtime: ${step.ms}ms
${step.error ? `- Error: \`${step.error.replaceAll("`", "'")}\`` : ""}
`,
  )
  .join("\n")}

## Safe Usage

\`\`\`bash
# after applying the real copied send-session report
npm run leadgen:post-send-refresh

# only if the report shows ready_to_send is empty and you want to refill the queue
npm run leadgen:post-send-refresh -- --apply-next-wave
\`\`\`
`;

writeFileSync(outputJsonPath, `${JSON.stringify(state, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);

console.log(
  JSON.stringify(
    {
      ok: state.ok,
      before,
      after,
      next_wave_import_ready: state.next_wave_import_ready,
      decisions,
      markdown: outputMarkdownPath,
      json: outputJsonPath,
      failed_steps: failures.map((step) => step.label),
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  process.exitCode = 1;
}
