import { readdir } from "node:fs/promises";
import path from "node:path";

const migrationsDirectory = path.resolve("src/db/migrations");
const migrationFilePattern = /^v(\d+)__.+\.sql$/i;

const migrationFiles = (
  await readdir(migrationsDirectory, {
    withFileTypes: true,
  })
)
  .filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"),
  )
  .map((entry) => entry.name)
  .filter((fileName) => fileName.startsWith("V") || fileName.startsWith("v"));

const migrations = migrationFiles.map((fileName) => {
  const match = migrationFilePattern.exec(fileName);

  if (!match) {
    throw new Error(
      `Invalid versioned migration name: ${fileName}. Use V<digits>__<description>.sql.`,
    );
  }

  return {
    fileName,
    version: BigInt(match[1]),
  };
});

const versions = new Map();

for (const migration of migrations) {
  const normalizedVersion = migration.version.toString();
  const matchingMigration = versions.get(normalizedVersion);

  if (matchingMigration) {
    throw new Error(
      `Duplicate migration version ${normalizedVersion}: ${matchingMigration} and ${migration.fileName}. ` +
        "Leading zeroes do not make a distinct version.",
    );
  }

  versions.set(normalizedVersion, migration.fileName);
}

const orderedMigrations = [...migrations].sort((left, right) =>
  left.version < right.version ? -1 : left.version > right.version ? 1 : 0,
);

if (orderedMigrations[0]?.version !== 1n) {
  const firstMigration = orderedMigrations[0];
  throw new Error(
    firstMigration
      ? `Migration ${firstMigration.fileName} has version ${firstMigration.version}. The sequence must start at V001.`
      : "No versioned migrations found. The sequence must start at V001.",
  );
}

for (let index = 1; index < orderedMigrations.length; index += 1) {
  const previous = orderedMigrations[index - 1];
  const current = orderedMigrations[index];
  const expectedVersion = previous.version + 1n;

  if (current.version !== expectedVersion) {
    throw new Error(
      `Migration ${current.fileName} has version ${current.version}, but version ${expectedVersion} ` +
        `must follow ${previous.fileName}. Use V${expectedVersion.toString().padStart(3, "0")}__<description>.sql ` +
        "(three digits are the project convention).",
    );
  }
}

const formattedVersions = orderedMigrations
  .map((migration) => migration.version)
  .join(", ");
console.log(
  `Migration versions are unique and sequential: ${formattedVersions || "none"}.`,
);
