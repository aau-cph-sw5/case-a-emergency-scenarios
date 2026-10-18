import { readdir, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileFromFile } from "json-schema-to-typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaDirectory = join(projectRoot, "contracts", "v1");
const outputDirectory = join(projectRoot, "shared", "types", "v1");

await mkdir(outputDirectory, { recursive: true });

const schemaFiles = (await readdir(schemaDirectory))
  .filter((file) => file.endsWith(".schema.json"))
  .sort();

for (const schemaFile of schemaFiles) {
  const output = await compileFromFile(join(schemaDirectory, schemaFile), {
    cwd: schemaDirectory,
  });
  const outputFile = `${basename(schemaFile, ".schema.json")}.ts`;
  await writeFile(join(outputDirectory, outputFile), output);
}

console.log(
  `Generated ${schemaFiles.length} v1 type modules in shared/types/v1`,
);
