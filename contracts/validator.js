// Shared contract validator: loads every v1 schema once and checks data against it.
// Used by @case-a/fixtures and @case-a/stub-server.

import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contracts = path.join(__dirname, "v1");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schemaIds = [];

for (const file of fs.readdirSync(contracts)) {
  if (file.endsWith(".schema.json")) {
    const schema = JSON.parse(
      fs.readFileSync(path.join(contracts, file), "utf8"),
    );
    ajv.addSchema(schema);
    schemaIds.push(schema.$id ?? file);
  }
}

ajv.addSchema({
  $id: "openapi-scenarios-response",
  type: "array",
  items: { $ref: "scenario.schema.json" },
});

export function listSchemaIds() {
  return [...schemaIds];
}

// Compiles the schema (throws if it is invalid) and returns its validator.
export function getValidator(schemaId) {
  return ajv.getSchema(schemaId);
}

export function validate(data, schemaIds) {
  const errors = [];

  for (const schemaId of schemaIds) {
    const check = ajv.getSchema(schemaId);

    if (!check(data)) {
      for (const error of check.errors) {
        errors.push(
          `${schemaId}: ${error.instancePath || "/"} ${error.message}`,
        );
      }
    }
  }

  return errors;
}
