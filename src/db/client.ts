import postgres from "postgres";

let sql: ReturnType<typeof postgres> | undefined;

export function getDatabase(): ReturnType<typeof postgres> {
  if (sql) {
    return sql;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set before connecting to the database.",
    );
  }

  sql = postgres(connectionString);
  return sql;
}
