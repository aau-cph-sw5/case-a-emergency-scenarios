// Runs commands from the repository root for the scripts in scripts/.
// Uses only Node built-ins so it can run before `npm ci`.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

// `capture` returns stdout instead of printing it. `timeout` is in ms.
// A command that times out has `error.code` set to "ETIMEDOUT".
export function run(
  command,
  args,
  { quiet = false, capture = false, timeout } = {},
) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: quiet
      ? "ignore"
      : capture
        ? ["inherit", "pipe", "inherit"]
        : "inherit",
    shell: process.platform === "win32" && command === "npm",
    timeout,
  });
  return result.error ? { status: null, error: result.error } : result;
}

export function npm(args) {
  // Under `npm run`, npm_execpath points at npm's own CLI script.
  return process.env.npm_execpath
    ? run(process.execPath, [process.env.npm_execpath, ...args])
    : run("npm", args);
}
