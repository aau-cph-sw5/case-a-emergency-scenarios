// colors for the script terminal messages warn/fail and succed
const useColour = process.stdout.isTTY && !process.env.NO_COLOR;

const yellow = (text) => (useColour ? `\x1b[33m${text}\x1b[0m` : text);
const red = (text) => (useColour ? `\x1b[31m${text}\x1b[0m` : text);
const green = (text) => (useColour ? `\x1b[32m${text}\x1b[0m` : text);

// Something is missing, but the script can carry on.
export function warn(message) {
  console.warn(yellow(`⚠ ${message}`));
}

// The script cannot carry on.
export function fail(message) {
  console.error(red(`✗ ${message}`));
}

// The script finished as intended
export function succeed(message) {
  console.log(green(`✓ ${message}`));
}
