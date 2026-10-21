// Fails when a coverage metric dropped more than "max-decrease" percentage points compared with dev.
// c8 ignores "max-decrease" in .c8rc.json; only this script and coverage-report.mjs read it.
// Argument: path to a coverage-summary.json from dev. If there is none, the check passes.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const METRICS = ["lines", "branches", "functions", "statements"];

const config = JSON.parse(readFileSync(".c8rc.json", "utf8"));
const reportDir = config["report-dir"] ?? "coverage";
const maxDecrease = config["max-decrease"];
const summary = JSON.parse(
  readFileSync(path.join(reportDir, "coverage-summary.json"), "utf8"),
);

const baselinePath = process.argv[2];

if (typeof maxDecrease !== "number") {
  console.log('No "max-decrease" in .c8rc.json, nothing to check.');
} else if (!baselinePath || !existsSync(baselinePath)) {
  console.log("No coverage from dev to compare with, nothing to check.");
} else {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

  for (const name of METRICS) {
    const before = baseline.total?.[name]?.pct;
    const after = summary.total[name].pct;
    if (typeof before !== "number" || typeof after !== "number") continue;

    const decrease = Math.round((before - after) * 100) / 100;
    if (decrease > maxDecrease) {
      console.log(
        `::error::${name} coverage dropped ${decrease} percentage points, from ${before}% on dev to ${after}%. At most ${maxDecrease} is allowed.`,
      );
      process.exitCode = 1;
    } else {
      console.log(`${name}: ${before}% on dev, ${after}% here.`);
    }
  }
}
