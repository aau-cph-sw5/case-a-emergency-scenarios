// Render the latest CI test results; missing or incomplete results stay visible.
import { readFileSync } from "node:fs";

function read(name) {
  try {
    return JSON.parse(readFileSync(`test-results/${name}.json`, "utf8"));
  } catch {
    return null;
  }
}

function counts(name) {
  const result = read(name);
  if (!result) return null;
  if (name === "jest") {
    const {
      numTotalTests: total,
      numPassedTests: passed,
      numFailedTests: failed,
      numPendingTests: pending,
      numTodoTests: todo,
    } = result;
    if (![total, passed, failed, pending, todo].every(Number.isFinite))
      return null;
    return { total, passed, failed, skipped: pending + todo };
  }
  const {
    tests: total,
    passed,
    failed,
    skipped,
    todo,
    cancelled,
  } = result.counts ?? {};
  if (![total, passed, failed, skipped, todo, cancelled].every(Number.isFinite))
    return null;
  return { total, passed, failed, skipped: skipped + todo + cancelled };
}

const jobs = [
  ["Unit", "unit", process.env.UNIT_RESULT],
  ["Integration", "integration", process.env.INTEGRATION_RESULT],
  ["Jest", "jest", process.env.JEST_RESULT],
];
const results = jobs.map(([label, name, status]) => ({
  label,
  status,
  counts: counts(name),
}));
const lines = [
  "<!-- test-results-report -->",
  "## Test results",
  "",
  "| Test suite | Tests | ✅ Passed | ❌ Failed | Skipped | Result |",
  "|---|---:|---:|---:|---:|:---:|",
  ...results.map(({ label, status, counts: value }) =>
    value
      ? `| ${label} | ${value.total} | ${value.passed} | ${value.failed} | ${value.skipped} | ${status === "success" ? "✅" : "❌"} |`
      : `| ${label} | – | – | – | – | ${status === "skipped" ? "Skipped" : "Unavailable ❌"} |`,
  ),
];
if (results.every((result) => result.counts)) {
  const total = results.reduce(
    (sum, { counts: value }) => ({
      total: sum.total + value.total,
      passed: sum.passed + value.passed,
      failed: sum.failed + value.failed,
      skipped: sum.skipped + value.skipped,
    }),
    { total: 0, passed: 0, failed: 0, skipped: 0 },
  );
  lines.push(
    `| **Total** | **${total.total}** | **${total.passed}** | **${total.failed}** | **${total.skipped}** | ${results.every(({ status }) => status === "success") ? "✅" : "❌"} |`,
  );
}
const {
  GITHUB_SERVER_URL: server,
  GITHUB_REPOSITORY: repository,
  GITHUB_RUN_ID: runId,
  GITHUB_SHA: sha,
} = process.env;
if (server && repository && runId)
  lines.push(
    "",
    `[View workflow run](${server}/${repository}/actions/runs/${runId})${sha ? ` · Tested commit: \`${sha.slice(0, 7)}\`` : ""}`,
  );
console.log(lines.join("\n"));
