import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";

// Every JSON schema in contracts/v1, registered under its $id
const contractsDirectory = path.resolve(process.cwd(), "contracts/v1");

const ajv = new Ajv({ allErrors: true });
addFormats.default(ajv);

for (const file of readdirSync(contractsDirectory)) {
  if (file.endsWith(".schema.json")) {
    ajv.addSchema(
      JSON.parse(readFileSync(path.join(contractsDirectory, file), "utf8")),
    );
  }
}

export function validate(data: unknown, schemaId: string): string[] {
  const check = ajv.getSchema(schemaId);
  if (!check) {
    throw new Error(`Unknown contract schema: ${schemaId}`);
  }
  if (check(data)) return [];

  return (check.errors ?? []).map(
    (error) => `${schemaId}: ${error.instancePath || "/"} ${error.message}`,
  );
}
