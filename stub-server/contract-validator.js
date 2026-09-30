import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contracts = path.join(__dirname, "../contracts/v1");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

for (const file of fs.readdirSync(contracts)) {
  if (file.endsWith(".schema.json")) {
    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(contracts, file), "utf8")));
  }
}

ajv.addSchema({
  $id: "openapi-scenarios-response",
  type: "array",
  items: { $ref: "scenario.schema.json" }
});

export function validate(data, schemaIds) {
  const errors = [];

  for (const schemaId of schemaIds) {
    const check = ajv.getSchema(schemaId);

    if (!check(data)) {
      for (const error of check.errors) {
        errors.push(`${schemaId}: ${error.instancePath || "/"} ${error.message}`);
      }
    }
  }

  return errors;
}
