// Turns c8's coverage-summary.json into Markdown for the job summary and the PR comment.
// Optional argument: path to a coverage-summary.json from dev to compare against.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const METRICS = ["lines", "branches", "functions", "statements"];

const config = JSON.parse(readFileSync(".c8rc.json", "utf8"));
const reportDir = config["report-dir"] ?? "coverage";
const summary = JSON.parse(
  readFileSync(path.join(reportDir, "coverage-summary.json"), "utf8"),
);

const baselinePath = process.argv[2];
const baseline =
  baselinePath && existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, "utf8"))
    : null;

function percent(metric) {
  return typeof metric.pct === "number" ? `${metric.pct}%` : "–";
}

function required(name, metric) {
  const minimum = config[name] ?? 0;
  if (!config["check-coverage"] || minimum === 0) return "report only";
  return `${metric.pct >= minimum ? "✅" : "❌"} ${minimum}%`;
}

function delta(name, metric) {
  const before = baseline?.total?.[name]?.pct;
  if (typeof before !== "number" || typeof metric.pct !== "number") return "–";
  const diff = Math.round((metric.pct - before) * 100) / 100;
  if (diff === 0) return "±0%";
  return diff > 0 ? `+${diff}%` : `−${Math.abs(diff)}%`;
}

const lines = [
  "<!-- coverage-report -->",
  "## Backend coverage (`src/`)",
  "",
  "| Metric | Covered | vs `dev` | Required |",
  "|---|---|---|---|",
  ...METRICS.map((name) => {
    const metric = summary.total[name];
    return `| ${name} | ${percent(metric)} (${metric.covered}/${metric.total}) | ${delta(name, metric)} | ${required(name, metric)} |`;
  }),
  "",
  baseline
    ? "_vs `dev` compares with the latest successful run on `dev`._"
    : "_No coverage from `dev` to compare with yet._",
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
