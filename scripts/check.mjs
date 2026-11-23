import { npm } from "./lib/run.mjs";

function run(script) {
  const result = npm(["run", script]);

  if (result.error) {
    console.error(`Could not run "npm run ${script}": ${result.error.message}`);
  }

  return result.status === 0;
}

const eslintPassed = run("lint");
const prettierPassed = run("format:check");
const typecheckPassed = run("typecheck");

console.log("\nCode-quality summary");
console.log(
  `${eslintPassed ? "✓" : "✗"} ESLint ${eslintPassed ? "passed" : "failed"}`,
);
console.log(
  `${prettierPassed ? "✓" : "✗"} Prettier ${prettierPassed ? "passed" : "failed"}`,
);
console.log(
  `${typecheckPassed ? "✓" : "✗"} TypeScript ${typecheckPassed ? "passed" : "failed"}`,
);

if (!eslintPassed || !prettierPassed || !typecheckPassed) {
  process.exitCode = 1;
}
