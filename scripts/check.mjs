import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(script) {
  const result = spawnSync(npmCommand, ["run", script], {
    stdio: "inherit",
  });

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
