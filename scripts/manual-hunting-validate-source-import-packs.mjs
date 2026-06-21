import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const leadsDir = "ops/leads";
const outputMarkdownPath = `ops/leads/manual-owner-hunting-source-import-packs-validate-${today}.md`;
const outputJsonPath = `ops/leads/manual-owner-hunting-source-import-packs-validate-${today}.json`;

const labels = [
  ...new Set(
    readdirSync(leadsDir)
      .map((file) => file.match(/^manual-owner-hunting-source-import-pack-(.+)-\d{4}-\d{2}-\d{2}\.json$/)?.[1])
      .filter(Boolean),
  ),
].sort();

const runValidation = (label) => {
  const startedAt = Date.now();

  try {
    const stdout = execFileSync("node", [
      "scripts/manual-hunting-validate-source-import-pack.mjs",
      `--label=${label}`,
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return {
      label,
      ok: true,
      ms: Date.now() - startedAt,
      result: JSON.parse(stdout),
      error: "",
    };
  } catch (error) {
    let result = null;
    const stdout = error.stdout ? String(error.stdout).trim() : "";
    try {
      result = stdout ? JSON.parse(stdout) : null;
    } catch {
      result = null;
    }

    return {
      label,
      ok: false,
      ms: Date.now() - startedAt,
      result,
      error: error.stderr ? String(error.stderr).trim() : error.message,
    };
  }
};

const validations = labels.map(runValidation);
const failures = validations.filter((validation) => !validation.ok || !validation.result?.ok);
const result = {
  ok: failures.length === 0,
  date: today,
  labels,
  labels_count: labels.length,
  failures: failures.map((validation) => validation.label),
  validations,
  outputs: {
    markdown: outputMarkdownPath,
    json: outputJsonPath,
  },
};

const markdown = `# Manual owner hunting source import packs validation

Date: ${today}

Purpose: validate every generated source import pack, not only the default label.

## Result

\`\`\`json
${JSON.stringify(
  {
    ok: result.ok,
    labels,
    failures: result.failures,
  },
  null,
  2,
)}
\`\`\`

## Packs

${validations
  .map((validation) => {
    const summary = validation.result || {};
    return `### ${validation.ok && summary.ok ? "OK" : "FAIL"} - ${validation.label}

- Runtime: ${validation.ms}ms
- Rows: ${summary.rows ?? "unknown"}
- Already appended: ${summary.already_appended ?? "unknown"}
- Warnings: ${(summary.warnings || []).length}
- Errors: ${(summary.errors || []).length}
${validation.error ? `- Error: \`${validation.error.replaceAll("`", "'")}\`` : ""}
`;
  })
  .join("\n")}
`;

writeFileSync(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(outputMarkdownPath, markdown);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      labels,
      failures: result.failures,
      markdown: outputMarkdownPath,
      json: outputJsonPath,
    },
    null,
    2,
  ),
);

if (!result.ok) {
  process.exit(1);
}
