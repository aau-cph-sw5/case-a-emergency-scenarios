// Validates every fixture served by the stub server against its contract schema.
// Run with: npm run validate

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../stub-server/contract-validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "../fixtures/v1");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function jsonFilesIn(dir) {
  return fs
    .readdirSync(path.join(fixtures, dir))
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dir, file));
}

const checks = [
  ["scenario-state.json", ["scenario-state.schema.json"]],
  [
    "scenarios.json",
    ["scenario-list.schema.json", "openapi-scenarios-response"],
  ],
  ...jsonFilesIn("scenarios").map((file) => [file, ["scenario.schema.json"]]),
  ...jsonFilesIn("metro-lines").map((file) => [
    file,
    ["metro-line.schema.json"],
  ]),
  ["position-report.json", ["position-report.schema.json"]],
];

let failures = 0;

for (const [fixture, schemaIds] of checks) {
  const errors = validate(readJson(path.join(fixtures, fixture)), schemaIds);

  if (errors.length === 0) {
    console.log(`PASS  ${fixture}`);
    continue;
  }

  failures++;
  console.log(`FAIL  ${fixture}`);
  for (const error of errors) {
    console.log(`        ${error}`);
  }
}

console.log(
  failures === 0
    ? "\nAll fixtures valid."
    : `\n${failures} fixture(s) invalid.`,
);

if (failures > 0) {
  process.exitCode = 1;
}
