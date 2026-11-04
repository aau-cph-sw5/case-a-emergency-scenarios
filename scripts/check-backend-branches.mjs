import { readFileSync } from "node:fs";
import path from "node:path";

const minimum = 75;
const summary = JSON.parse(
  readFileSync("coverage/coverage-summary.json", "utf8"),
);
let covered = 0;
let total = 0;
for (const [file, metrics] of Object.entries(summary)) {
  if (file === "total") continue;
  const relative = path.relative(process.cwd(), file).split(path.sep).join("/");
  if (
    !relative.startsWith("src/") ||
    !relative.endsWith(".ts") ||
    relative.endsWith(".d.ts")
  )
    continue;
  const branches = metrics.branches;
  if (
    !Number.isInteger(branches?.total) ||
    !Number.isInteger(branches?.covered) ||
    branches.total < 0 ||
    branches.covered < 0 ||
    branches.covered > branches.total
  ) {
    throw new Error(`Invalid backend branch coverage for ${relative}`);
  }
  total += branches.total;
  covered += branches.covered;
}
if (total === 0) throw new Error("No backend branch coverage found.");
const percent = ((covered * 100) / total).toFixed(2);
console.log(
  `Backend branch coverage: ${percent}% (${covered}/${total}); minimum ${minimum}%.`,
);
if (covered * 100 < minimum * total) {
  console.error(`::error::Backend branch coverage is below ${minimum}%.`);
  process.exitCode = 1;
}
