// Reports application coverage and checks combined line coverage of changed files.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MINIMUM = 80;
const check = process.argv.includes("--check");
const base = process.env.COVERAGE_BASE;
const nodeCoverage = JSON.parse(
  readFileSync("coverage/coverage-final.json", "utf8"),
);
const jestCoverage = JSON.parse(
  readFileSync("coverage/jest/coverage-final.json", "utf8"),
);

const relative = (file) =>
  path.relative(process.cwd(), file).split(path.sep).join("/");
const inScope = (file) =>
  /^(?:src\/.*\.ts|shared\/.*\.tsx?|web\/src\/.*\.tsx?|mobile\/src\/.*\.tsx?|mobile\/App\.tsx)$/.test(
    file,
  ) &&
  !file.endsWith(".d.ts") &&
  !file.startsWith("shared/types/") &&
  file !== "web/src/main.tsx";
const isFrontend = (file) => /^(?:shared|web|mobile)\//.test(file);

// Istanbul maps statement hits to their starting lines. Jest defines the
// frontend's executable lines; c8 contributes hits from Node tests on those
// same lines. Never add percentages or count a line twice.
function lineHits(coverage) {
  const lines = new Map();
  for (const [id, location] of Object.entries(coverage.statementMap)) {
    const line = location.start.line;
    lines.set(line, Math.max(lines.get(line) ?? 0, coverage.s[id] ?? 0));
  }
  return lines;
}
const nodeFiles = new Map(
  Object.entries(nodeCoverage).map(([file, data]) => [relative(file), data]),
);
const jestFiles = new Map(
  Object.entries(jestCoverage).map(([file, data]) => [relative(file), data]),
);
const files = new Map();
for (const file of new Set([...nodeFiles.keys(), ...jestFiles.keys()])) {
  if (!inScope(file)) continue;
  const node = nodeFiles.get(file);
  const jest = jestFiles.get(file);
  if (isFrontend(file) && !jest) continue;
  const lines = lineHits(isFrontend(file) ? jest : node);
  if (isFrontend(file) && node) {
    for (const [line, hits] of lineHits(node)) {
      if (lines.has(line)) lines.set(line, Math.max(lines.get(line), hits));
    }
  }
  const covered = [...lines.values()].filter((hits) => hits > 0).length;
  const total = lines.size;
  files.set(file, {
    hits: lines,
    lines: {
      covered,
      total,
      pct: total ? Math.floor((covered * 10000) / total) / 100 : 100,
    },
  });
}
const overall = [...files.values()].reduce(
  (total, { lines }) => ({
    covered: total.covered + lines.covered,
    total: total.total + lines.total,
  }),
  { covered: 0, total: 0 },
);
overall.pct = overall.total
  ? Math.floor((overall.covered * 10000) / overall.total) / 100
  : 100;

if (check && !base)
  throw new Error(
    "COVERAGE_BASE must identify the PR or merge queue base commit.",
  );

const changed = base
  ? execFileSync(
      "git",
      [
        "diff",
        "--name-only",
        "-z",
        "--diff-filter=ACMRT",
        "--no-renames",
        base,
        "HEAD",
      ],
      {
        encoding: "utf8",
      },
    )
      .split("\0")
      .filter(inScope)
  : [];

const percent = (metric) => `${metric.pct}%`;
const fileLabel = (file) => {
  const label = file.replace(/[\\[\]|]/g, "\\$&");
  const {
    GITHUB_SERVER_URL: server,
    GITHUB_REPOSITORY: repository,
    GITHUB_SHA: sha,
  } = process.env;
  if (!server || !repository || !sha) return `\`${file.replace(/`/g, "\\`")}\``;
  const encoded = file.split("/").map(encodeURIComponent).join("/");
  return `[${label}](${server}/${repository}/blob/${sha}/${encoded})`;
};
const failures = [];
let coveredLines = 0;
let totalLines = 0;
const rows = changed.map((file) => {
  const data = files.get(file);
  const metric = data?.lines;
  if (
    !metric ||
    !Number.isInteger(metric.total) ||
    !Number.isInteger(metric.covered) ||
    metric.total < 0 ||
    metric.covered < 0 ||
    metric.covered > metric.total
  ) {
    failures.push(`${file}: missing or invalid line coverage`);
    return `| ${fileLabel(file)} | missing | ❌ |`;
  }
  coveredLines += metric.covered;
  totalLines += metric.total;
  const result =
    metric.total === 0
      ? "–"
      : metric.covered * 100 >= MINIMUM * metric.total
        ? "✅"
        : "❌";
  const coverage =
    metric.total === 0 ? "No executable lines" : `${percent(metric)}`;
  return `| ${fileLabel(file)} | ${coverage} | ${result} |`;
});
const combinedPasses =
  totalLines === 0 || coveredLines * 100 >= MINIMUM * totalLines;
const combined =
  totalLines === 0
    ? "No executable lines"
    : `${((coveredLines * 100) / totalLines).toFixed(2)}% (${coveredLines}/${totalLines})`;
if (!combinedPasses)
  failures.push(`Combined line coverage ${combined} is below ${MINIMUM}%.`);

const lines = [
  "<!-- coverage-report -->",
  "## Code coverage",
  "",
  ...(base
    ? changed.length
      ? [
          `| File | Line coverage | ${failures.length ? "❌" : "✅"} |`,
          "|---|---:|:---:|",
          `| **Changed files combined** | **${failures.some((failure) => failure.includes("invalid line coverage")) ? "Incomplete" : combined}** | **${failures.length ? "❌" : "✅"}** |`,
          ...rows,
          "",
          `The combined line coverage of changed application files must reach ${MINIMUM}%.`,
        ]
      : ["No eligible application source files changed."]
    : ["Changed-file coverage is checked on pull requests and merge queues."]),
  "",
  "| Overall application line coverage | Coverage |",
  "|---|---:|",
  `| Tested merge | ${percent(overall)} (${overall.covered}/${overall.total}) |`,
];

if (process.argv.includes("--write-lcov")) {
  const records = [];
  for (const [file, data] of files) {
    if (data.hits.size === 0) continue;
    records.push(`SF:${file}`);
    for (const [line, hits] of [...data.hits].sort(([a], [b]) => a - b)) {
      records.push(`DA:${line},${hits > 0 ? 1 : 0}`);
    }
    records.push(
      `LF:${data.lines.total}`,
      `LH:${data.lines.covered}`,
      "end_of_record",
    );
  }
  writeFileSync("coverage/lcov.info", `${records.join("\n")}\n`);
} else if (check) {
  if (failures.length) {
    for (const failure of failures) console.error(`::error::${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Changed-file coverage passed (${changed.length} files).`);
  }
} else {
  console.log(lines.join("\n"));
}
