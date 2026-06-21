import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const planPath = "ops/leads/manual-owner-hunting-refill-plan-2026-06-19.json";

const parseArgs = (args) => {
  const options = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rawValue] = arg.slice(2).split("=");
    options[rawKey] = rawValue.length ? rawValue.join("=") : "true";
  }

  return options;
};

const extractOption = (command, name, fallback = "") => {
  const match = command.match(new RegExp(`--${name}=(?:"([^"]*)"|([^\\s]+))`));
  return match?.[1] || match?.[2] || fallback;
};

const runNpm = (args) => {
  const result = spawnSync("npm", args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const shellQuote = (value) => {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
};

const formatNpmCommand = (args) => `npm ${args.map(shellQuote).join(" ")}`;

const options = parseArgs(process.argv.slice(2));
const apply = options.apply === "true";
const skipAfter = options["skip-after"] === "true";

if (!existsSync(planPath)) {
  console.error(`Missing refill plan: ${planPath}`);
  console.error("Run: npm run leads:manual-refill -- --target=10");
  process.exit(1);
}

const plan = JSON.parse(readFileSync(planPath, "utf8"));
const planned = Array.isArray(plan.planned) ? plan.planned : [];

if (!planned.length) {
  console.log(
    JSON.stringify(
      {
        dry_run: !apply,
        action: "noop",
        reason: "refill plan has no planned rows",
        plan_path: planPath,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (apply && plan.simulated_ready_to_send !== null && plan.simulated_ready_to_send !== undefined) {
  console.error("Refusing to apply a simulated refill plan.");
  console.error("Generate a real plan after statuses change:");
  console.error("  npm run leads:manual-refill -- --target=10");
  process.exit(1);
}

const commands = planned.map((row) => {
  const followUp = extractOption(row.command || "", "follow-up", "2026-06-24");
  const notes = extractOption(row.command || "", "notes", "ready for outreach");

  if (row.action === "promote_reserve") {
    return {
      candidate_id: row.candidate_id,
      action: row.action,
      args: [
        "run",
        "leads:manual-status",
        "--",
        row.candidate_id,
        "ready_to_send",
        `--follow-up=${followUp}`,
        `--notes=${notes}`,
      ],
    };
  }

  if (row.action === "import_expansion_after_live_check") {
    return {
      candidate_id: row.candidate_id,
      action: row.action,
      args: [
        "run",
        "leads:manual-import-expansion",
        "--",
        row.candidate_id,
        "ready_to_send",
        `--follow-up=${followUp}`,
        `--notes=${notes}`,
      ],
    };
  }

  console.error(`Unknown refill action for ${row.candidate_id}: ${row.action}`);
  process.exit(1);
});

const afterCommands = [
  ["run", "leads:manual-validate"],
  ["run", "leads:manual-live-preflight"],
  ["run", "leads:manual-export"],
  ["run", "leads:manual-send-session"],
  ["run", "leads:manual-followups"],
  ["run", "leads:manual-handoff"],
  ["run", "leads:manual-source-review"],
  ["run", "leads:manual-cockpit"],
  ["run", "leads:manual-summary"],
];

if (!apply) {
  console.log(
    JSON.stringify(
      {
        dry_run: true,
        plan_path: planPath,
        simulated_plan: plan.simulated_ready_to_send !== null && plan.simulated_ready_to_send !== undefined,
        apply_blocked_until_real_plan:
          plan.simulated_ready_to_send !== null && plan.simulated_ready_to_send !== undefined,
        planned_count: commands.length,
        commands: commands.map((command) => formatNpmCommand(command.args)),
        after_commands: afterCommands.map((command) => formatNpmCommand(command)),
        apply_command: "npm run leads:manual-apply-refill -- --apply",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

for (const command of commands) {
  runNpm(command.args);
}

if (!skipAfter) {
  for (const command of afterCommands) {
    runNpm(command);
  }
}

console.log(
  JSON.stringify(
    {
      dry_run: false,
      applied_count: commands.length,
      regenerated_outputs: !skipAfter,
      plan_path: planPath,
    },
    null,
    2,
  ),
);
