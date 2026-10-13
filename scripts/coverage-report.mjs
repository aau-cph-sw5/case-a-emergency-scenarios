// Turns c8's coverage-summary.json into Markdown for the job summary and the PR comment.
import { readFileSync } from "node:fs";
import path from "node:path";

const METRICS = ["lines", "branches", "functions", "statements"];

const config = JSON.parse(readFileSync(".c8rc.json", "utf8"));
const reportDir = config["report-dir"] ?? "coverage";
const summary = JSON.parse(
  readFileSync(path.join(reportDir, "coverage-summary.json"), "utf8"),
);

function percent(metric) {
  return typeof metric.pct === "number" ? `${metric.pct}%` : "–";
}

function required(name, metric) {
  const minimum = config[name] ?? 0;
  if (!config["check-coverage"] || minimum === 0) return "report only";
  return `${metric.pct >= minimum ? "✅" : "❌"} ${minimum}%`;
}

const lines = [
  "<!-- coverage-report -->",
  "## Backend coverage (`src/`)",
  "",
  "| Metric | Covered | Required |",
  "|---|---|---|",
  ...METRICS.map((name) => {
    const metric = summary.total[name];
    return `| ${name} | ${percent(metric)} (${metric.covered}/${metric.total}) | ${required(name, metric)} |`;
  }),
  "",
  "<details><summary>Per file</summary>",
  "",
  "| File | Lines | Branches | Functions |",
  "|---|---|---|---|",
  ...Object.entries(summary)
    .filter(([file]) => file !== "total")
    .map(
      ([file, data]) =>
        `| \`${path.relative(process.cwd(), file)}\` | ${percent(data.lines)} | ${percent(data.branches)} | ${percent(data.functions)} |`,
    ),
  "",
  "</details>",
  "",
  "Run `npm run test:coverage` locally and open `coverage/index.html` to see uncovered lines.",
];

console.log(lines.join("\n"));
