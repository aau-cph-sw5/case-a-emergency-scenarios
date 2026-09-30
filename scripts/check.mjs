import { spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(script) {
  const result = spawnSync(npmCommand, ['run', script], {
    stdio: 'inherit',
  });

  return result.status === 0;
}

const eslintPassed = run('lint');
const prettierPassed = run('format:check');

console.log('\nCode-quality summary');
console.log(
  `${eslintPassed ? '✓' : '✗'} ESLint ${eslintPassed ? 'passed' : 'failed'}`,
);
console.log(
  `${prettierPassed ? '✓' : '✗'} Prettier ${prettierPassed ? 'passed' : 'failed'}`,
);

if (!eslintPassed || !prettierPassed) {
  process.exitCode = 1;
}
