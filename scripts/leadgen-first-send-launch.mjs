import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const paths = {
  sendSessionHtml: "ops/leads/manual-owner-hunting-send-session-2026-06-19.html",
  sendSessionMarkdown: "ops/leads/manual-owner-hunting-send-session-2026-06-19.md",
  sendPacketJson: "ops/leads/manual-owner-hunting-send-packet-2026-06-19.json",
  sessionReportTemplate: "ops/leads/manual-owner-hunting-session-report-template-2026-06-19.txt",
  closeout: "ops/leads/manual-owner-hunting-send-session-closeout-2026-06-19.md",
  livePreflightJson: "ops/leads/manual-owner-hunting-live-preflight-2026-06-19.json",
  nextWaveValidateJson: "ops/leads/manual-owner-hunting-next-wave-validate-2026-06-19.json",
  qualityAuditJson: "ops/leads/manual-owner-hunting-quality-audit-2026-06-19.json",
  sendDaySimulationJson: "ops/leadgen-send-day-simulation-2026-06-19.json",
  backlogRunwayJson: "ops/leadgen-backlog-runway-2026-06-19.json",
  markdown: `ops/leadgen-first-send-launch-${today}.md`,
  html: `ops/leadgen-first-send-launch-${today}.html`,
  json: `ops/leadgen-first-send-launch-${today}.json`,
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

const readJson = (path, fallback = {}) => {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
};

const parseJsonFromStdout = (stdout, fallback = {}) => {
  const lines = String(stdout || "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().startsWith("{"));
  if (start === -1) return fallback;

  try {
    return JSON.parse(lines.slice(start).join("\n"));
  } catch {
    return fallback;
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const steps = [
  run("live_preflight", "npm", ["run", "leads:manual-live-preflight"]),
  run("send_session", "npm", ["run", "leads:manual-send-session"]),
  run("validate_send_packet", "npm", ["run", "leads:manual-validate-send-packet"]),
  run("validate_next_wave", "npm", ["run", "leads:manual-validate-next-wave"]),
  run("quality_audit", "npm", ["run", "leads:manual-quality-audit"]),
  run("simulate_send_day", "npm", ["run", "leadgen:simulate-send-day"]),
  run("backlog_runway", "npm", ["run", "leadgen:backlog-runway"]),
  run("summary", "npm", ["run", "leads:manual-summary"]),
];

const failures = steps.filter((step) => !step.ok);
const preflight = readJson(paths.livePreflightJson, { counts: {}, results: [] });
const sendPacket = readJson(paths.sendPacketJson, { queue: [], preflight: {} });
const nextWave = readJson(paths.nextWaveValidateJson, { ok: false, counts: {}, errors: [], warnings: [] });
const quality = readJson(paths.qualityAuditJson, { ok: false, counts: {}, errors: [], warnings: [] });
const simulation = readJson(paths.sendDaySimulationJson, { ok: false, before: {}, after_refill_next_wave: {} });
const runway = readJson(paths.backlogRunwayJson, { current: {}, base_runway: {} });
const baseRunway = runway.base_runway || (runway.scenario_runway || []).find((row) => row.scenario === "base") || {};
const summary = steps.find((step) => step.label === "summary");
const summaryJson = parseJsonFromStdout(summary?.stdout, {});

const blockers = [];
const warnings = [];

if (failures.length) blockers.push(`Failed prerequisite steps: ${failures.map((step) => step.label).join(", ")}`);
if ((summaryJson.ready_to_send || 0) !== 10) blockers.push(`Expected 10 ready_to_send, found ${summaryJson.ready_to_send || 0}.`);
if ((summaryJson.contacted || 0) !== 0) warnings.push(`contacted is already ${summaryJson.contacted}; first-send launch may not be first send anymore.`);
if ((preflight.counts?.send_ok || 0) !== 10 || (preflight.counts?.do_not_send || 0) !== 0) {
  blockers.push(
    `Live preflight not clean: send_ok=${preflight.counts?.send_ok || 0}, do_not_send=${preflight.counts?.do_not_send || 0}.`,
  );
}
if ((sendPacket.queue || []).length !== 10) blockers.push(`Send packet has ${(sendPacket.queue || []).length} rows, expected 10.`);
if (sendPacket.preflight?.send_ok !== 10 || sendPacket.preflight?.do_not_send !== 0) {
  blockers.push(
    `Send packet preflight not clean: send_ok=${sendPacket.preflight?.send_ok || 0}, do_not_send=${sendPacket.preflight?.do_not_send || 0}.`,
  );
}
if (!nextWave.ok || (nextWave.counts?.import_ready || 0) !== 10 || (nextWave.counts?.row_errors || 0) !== 0) {
  blockers.push(
    `Next-wave gate not clean: ok=${Boolean(nextWave.ok)}, import_ready=${nextWave.counts?.import_ready || 0}, row_errors=${nextWave.counts?.row_errors || 0}.`,
  );
}
if (!quality.ok || (quality.errors || []).length > 0 || (quality.counts?.active_findings || 0) > 0) {
  blockers.push(
    `Quality audit not clean for active queue: ok=${Boolean(quality.ok)}, active_findings=${quality.counts?.active_findings || 0}.`,
  );
}
if (!simulation.ok || (simulation.expected_daily_contact_capacity || 0) !== 10 || (simulation.expected_ready_after_refill || 0) !== 10) {
  blockers.push("Send-day simulation does not prove +10 contacted and +10 ready_to_send after refill.");
}

if ((nextWave.warnings || []).length) warnings.push(`Next-wave warnings: ${(nextWave.warnings || []).length}.`);
if ((quality.warnings || []).length) warnings.push(`Expansion quality warnings: ${(quality.warnings || []).length}.`);
if ((runway.current?.usable_reviewed_prospects || 0) < 100) {
  warnings.push(`Reviewed runway below 100: ${runway.current?.usable_reviewed_prospects || 0}.`);
}

const go = blockers.length === 0;
const sendIds = (sendPacket.queue || []).map((row) => row.candidate_id);

const result = {
  ok: go,
  date: today,
  decision: go ? "GO_SEND_FIRST_10" : "NO_GO",
  blockers,
  warnings,
  metrics: {
    ready_to_send: summaryJson.ready_to_send || 0,
    contacted: summaryJson.contacted || 0,
    qualified_ab_leads: summaryJson.qualified_ab_leads || 0,
    send_ok: preflight.counts?.send_ok || 0,
    send_packet_rows: (sendPacket.queue || []).length,
    next_wave_import_ready: nextWave.counts?.import_ready || 0,
    usable_reviewed_prospects: runway.current?.usable_reviewed_prospects || 0,
    sourcing_deficit: baseRunway.sourcing_deficit || 0,
    simulated_contacted_after_send: simulation.after_send_all_packet_rows?.contacted || 0,
    simulated_ready_after_refill: simulation.after_refill_next_wave?.ready_to_send || 0,
  },
  send_ids: sendIds,
  files: {
    send_session_html: paths.sendSessionHtml,
    send_session_markdown: paths.sendSessionMarkdown,
    session_report_template: paths.sessionReportTemplate,
    closeout: paths.closeout,
    first_send_launch_markdown: paths.markdown,
    first_send_launch_html: paths.html,
    first_send_launch_json: paths.json,
  },
  commands: {
    open_send_session: `open ${paths.sendSessionHtml}`,
    dry_run_empty_report: `npm run leadgen:first-send-launch`,
    closeout_dry_run: `npm run leadgen:send-day-closeout -- --report="$tmpfile"`,
    closeout_apply: `npm run leadgen:send-day-closeout -- --report="$tmpfile" --apply`,
    closeout_apply_and_refill: `npm run leadgen:send-day-closeout -- --report="$tmpfile" --apply --apply-next-wave`,
  },
  steps,
  outputs: {
    markdown: paths.markdown,
    html: paths.html,
    json: paths.json,
  },
};

const markdown = `# First send launch gate

Date: ${today}

Decision: **${result.decision}**

## Metrics

\`\`\`json
${JSON.stringify(result.metrics, null, 2)}
\`\`\`

## Blockers

${blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none"}

## Warnings

${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- none"}

## Send IDs

${sendIds.map((id) => `- ${id}`).join("\n")}

## Operator Flow

1. Open \`${paths.sendSessionHtml}\`.
2. Send all 10 messages manually in the listing platforms.
3. Copy the session report or edit \`${paths.sessionReportTemplate}\` from \`open\` to \`sent\` / \`blocked\`.
4. Put the report in a temp file outside the repo.
5. Run closeout dry-run, then apply, then refill only after the dry-run matches reality.

\`\`\`bash
tmpfile=$(mktemp)
pbpaste > "$tmpfile"
npm run leadgen:send-day-closeout -- --report="$tmpfile"
npm run leadgen:send-day-closeout -- --report="$tmpfile" --apply
npm run leadgen:send-day-closeout -- --report="$tmpfile" --apply --apply-next-wave
rm "$tmpfile"
\`\`\`

## Files

- Send session: \`${paths.sendSessionHtml}\`
- Session report template: \`${paths.sessionReportTemplate}\`
- Closeout runbook: \`${paths.closeout}\`
`;

const html = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>First send launch gate</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #181b20; background: #f5f3ee; }
      body { margin: 0; padding: 32px; }
      main { max-width: 1080px; margin: 0 auto; }
      h1 { font-size: 32px; margin: 0 0 8px; letter-spacing: 0; }
      h2 { font-size: 18px; margin: 28px 0 12px; }
      .decision { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border-radius: 6px; font-weight: 700; background: ${go ? "#dff3dd" : "#f8d7da"}; color: ${go ? "#14571a" : "#7a1620"}; border: 1px solid ${go ? "#9ed59a" : "#e5a0a6"}; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 20px; }
      .metric, .panel { background: #fff; border: 1px solid #dedbd2; border-radius: 8px; padding: 14px; }
      .metric span { display: block; font-size: 12px; color: #6d706c; }
      .metric strong { display: block; margin-top: 6px; font-size: 22px; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 6px 0; }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      pre { white-space: pre-wrap; background: #20242b; color: #f7f3ea; border-radius: 8px; padding: 14px; overflow-x: auto; }
      a { color: #174ea6; }
      .ids { columns: 2; }
      @media (max-width: 680px) { body { padding: 18px; } .ids { columns: 1; } }
    </style>
  </head>
  <body>
    <main>
      <h1>First Send Launch Gate</h1>
      <div class="decision">${escapeHtml(result.decision)}</div>
      <section class="grid">
        ${Object.entries(result.metrics)
          .map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
          .join("")}
      </section>
      <section class="panel">
        <h2>Blockers</h2>
        <ul>${(blockers.length ? blockers : ["none"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section class="panel">
        <h2>Warnings</h2>
        <ul>${(warnings.length ? warnings : ["none"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section class="panel">
        <h2>Send IDs</h2>
        <ul class="ids">${sendIds.map((id) => `<li>${escapeHtml(id)}</li>`).join("")}</ul>
      </section>
      <section class="panel">
        <h2>Operator Flow</h2>
        <ol>
          <li>Open <code>${escapeHtml(paths.sendSessionHtml)}</code>.</li>
          <li>Send all 10 messages manually in the listing platforms.</li>
          <li>Copy the session report or edit the report template from <code>open</code> to <code>sent</code> / <code>blocked</code>.</li>
          <li>Run the closeout commands below.</li>
        </ol>
        <pre>tmpfile=$(mktemp)
pbpaste &gt; "$tmpfile"
npm run leadgen:send-day-closeout -- --report="$tmpfile"
npm run leadgen:send-day-closeout -- --report="$tmpfile" --apply
npm run leadgen:send-day-closeout -- --report="$tmpfile" --apply --apply-next-wave
rm "$tmpfile"</pre>
      </section>
    </main>
  </body>
</html>
`;

writeFileSync(paths.json, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(paths.markdown, markdown);
writeFileSync(paths.html, html);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      decision: result.decision,
      blockers,
      warnings,
      metrics: result.metrics,
      markdown: paths.markdown,
      html: paths.html,
      json: paths.json,
    },
    null,
    2,
  ),
);

if (!result.ok) {
  process.exit(1);
}
