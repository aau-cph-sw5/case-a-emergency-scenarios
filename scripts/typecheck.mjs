import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "tsc.cmd" : "tsc";
const result = spawnSync(command, ["--noEmit"], { stdio: "inherit" });

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status || 1;
} else {
  console.log("✓ TypeScript type check passed");
}
