import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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
      stdout: stdout.trim().slice(-6000),
      error: "",
    };
  } catch (error) {
    return {
      label,
      ok: false,
      ms: Date.now() - startedAt,
      command: [command, ...args].join(" "),
      stdout: error.stdout ? String(error.stdout).trim().slice(-6000) : "",
      error: error.stderr ? String(error.stderr).trim().slice(-6000) : error.message,
    };
  }
};

const options = parseArgs(process.argv.slice(2));
const reportPath = options.report || "";
const reportText = options.text || "";
const apply = options.apply === "true";
const applyNextWave = options["apply-next-wave"] === "true";
const followUp = options["follow-up"] || "2026-06-24";
const mode = apply ? "apply" : "dry-run";
const outputMarkdownPath = `ops/leadgen-send-day-closeout-${mode}-${today}.md`;
const outputJsonPath = `ops/leadgen-send-day-closeout-${mode}-${today}.json`;
const errors = [];
const decisions = [];
const steps = [];

if (!reportPath && !reportText) {
  errors.push("Missing --report=/tmp/send-session-report.txt or --text='HUNT-001 | sent |'.");
}

if (reportPath && !existsSync(reportPath)) {
  errors.push(`Missing report file: ${reportPath}`);
}

if (applyNextWave && !apply) {
  errors.push("--apply-next-wave requires --apply so the queue state is truthful before refill.");
}

if (!errors.length) {
  const reportPreview = reportPath ? readFileSync(reportPath, "utf8") : reportText;
  const sentRows = reportPreview
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^HUNT-\d{3}\s*\|\s*(sent|contacted)\b/i.test(line));
  const blockedRows = reportPreview
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^HUNT-\d{3}\s*\|\s*(blocked|stop|not_fit)\b/i.test(line));
  const openRows = reportPreview
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^HUNT-\d{3}\s*\|\s*open\b/i.test(line));

  decisions.push(
    apply
      ? "Apply mode: session report will mutate the lead log before regenerating operating outputs."
      : "Dry-run mode: session report is validated and simulated, but the lead log is not mutated.",
  );
  decisions.push(
    `Report preview: ${sentRows.length} sent/contacted, ${blockedRows.length} blocked/not_fit, ${openRows.length} open.`,
  );

  if (applyNextWave && openRows.length > 0) {
    errors.push(
      `--apply-next-wave refused because ${openRows.length} report rows are still open. Mark every row sent or blocked before refill.`,
    );
  }

  if (errors.length) {
    decisions.push("Closeout stopped before mutating the lead log.");
  }

  const reportArgs = reportPath ? [`--report=${reportPath}`] : [`--text=${reportText}`];
  if (!errors.length) {
    steps.push(
      run("session_report_dry_run", "npm", [
        "run",
        "leads:manual-apply-session-report",
        "--",
        ...reportArgs,
        `--follow-up=${followUp}`,
      ]),
    );

    if (apply) {
      steps.push(
        run("session_report_apply", "npm", [
          "run",
          "leads:manual-apply-session-report",
          "--",
          ...reportArgs,
          `--follow-up=${followUp}`,
          "--apply",
        ]),
      );
    }

    steps.push(run("post_send_refresh", "npm", ["run", "leadgen:post-send-refresh"]));

    if (applyNextWave) {
      steps.push(
        run("post_send_refresh_apply_next_wave", "npm", [
          "run",
          "leadgen:post-send-refresh",
          "--",
          "--apply-next-wave",
        ]),
      );
    }

    steps.push(run("summary", "npm", ["run", "leads:manual-summary"]));
    steps.push(run("backlog_runway", "npm", ["run", "leadgen:backlog-runway"]));
    steps.push(run("daily_operator", "npm", ["run", "leadgen:daily-operator"]));
  }
}

const failures = steps.filter((step) => !step.ok);
const ok = errors.length === 0 && failures.length === 0;

if (ok) {
  if (applyNextWave) {
    decisions.push("Next state should show a refilled ready_to_send queue if the previous queue was fully consumed.");
  } else if (apply) {
    decisions.push("Next action: inspect daily operator output; refill with --apply-next-wave only when ready_to_send is empty.");
  } else {
    decisions.push("Next action: rerun the same command with --apply only after the dry-run matches the real send session.");
  }
}

const state = {
  ok,
  date: today,
  mode,
  apply,
  apply_next_wave: applyNextWave,
  follow_up: followUp,
  report_source: reportPath || "--text",
  errors,
  decisions,
  failed_steps: failures.map((step) => step.label),
  steps,
  outputs: {
    markdown: outputMarkdownPath,
    json: outputJsonPath,
  },
};

const markdown = `# Leadgen send day closeout

Date: ${today}

Purpose: one safe operator command after a real manual send session.

## Status

\`\`\`json
${JSON.stringify(
  {
    ok,
    mode,
    apply,
    apply_next_wave: applyNextWave,
    failed_steps: state.failed_steps,
    errors,
  },
  null,
  2,
)}
\`\`\`

## Decisions

${decisions.length ? decisions.map((decision) => `- ${decision}`).join("\n") : "- none"}

## Steps

${steps.length
  ? steps
      .map(
        (step) => `### ${step.ok ? "OK" : "FAIL"} - ${step.label}

- Command: \`${step.command}\`
- Runtime: ${step.ms}ms
${step.error ? `- Error: \`${step.error.replaceAll("`", "'")}\`` : ""}
`,
      )
      .join("\n")
  : "- none"}

## Usage

\`\`\`bash
tmpfile=$(mktemp)
pbpaste > "$tmpfile"
npm run leadgen:send-day-closeout -- --report="$tmpfile"
npm run leadgen:send-day-closeout -- --report="$tmpfile" --apply
npm run leadgen:send-day-closeout -- --report="$tmpfile" --apply --apply-next-wave
rm "$tmpfile"
\`\`\`

The final command is only for a real report that consumed the current ready queue.
`;

writeFileSync(outputJsonPath, `${JSON.stringify(state, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);

console.log(
  JSON.stringify(
    {
      ok,
      mode,
      apply,
      apply_next_wave: applyNextWave,
      decisions,
      failed_steps: state.failed_steps,
      errors,
      markdown: outputMarkdownPath,
      json: outputJsonPath,
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exitCode = 1;
}
