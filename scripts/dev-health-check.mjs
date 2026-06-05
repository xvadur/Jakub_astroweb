import { execFileSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(cmd, args = []) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch (error) {
    return `ERR: ${error.message.split("\n")[0]}`;
  }
}

function pathStatus(path) {
  if (!existsSync(path)) return "missing";
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return "symlink";
  if (stat.isDirectory()) return "directory";
  if (stat.isFile()) return "file";
  return "exists";
}

const checks = [
  ["cwd", root],
  ["node", run("node", ["-v"])],
  ["npm", run("npm", ["-v"])],
  ["wrangler", run("npx", ["wrangler", "--version"])],
  ["docker", run("docker", ["--version"])],
  ["gh", run("gh", ["--version"]).split("\n")[0]],
  ["git branch", run("git", ["status", "--short", "--branch"]).split("\n")[0]],
  ["disk", run("df", ["-h", root]).split("\n").at(-1)],
  ["dist", pathStatus(join(root, "dist"))],
  ["private secrets", pathStatus(join(root, "private", "secrets"))],
  ["OpenClaw runtime", pathStatus("/Users/xvadur_mac/Diera/active/jakub/OpenClaw")],
  ["OpenClaw context", pathStatus("/Users/xvadur_mac/Diera/active/jakub/OpenClaw_Control")]
];

console.log("Jakub dev health\n");
for (const [label, value] of checks) {
  console.log(`${label.padEnd(18)} ${value}`);
}

console.log("\nGit working tree\n");
console.log(run("git", ["status", "--short"]));
