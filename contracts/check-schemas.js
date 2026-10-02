// Compiles every schema in v1/ so a broken schema fails here, before any
// fixture or client is checked against it.
// Run with: npm run validate (from the repo root)

import { listSchemaIds, getValidator } from "./validator.js";

let failures = 0;

for (const id of listSchemaIds()) {
  try {
    getValidator(id);
    console.log(`✓ ${id}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${id}: ${error.message}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} schema(s) failed to compile.`);
  process.exitCode = 1;
}
