import postgres from "postgres";

let sql;

export function getDatabase() {
  if (sql) {
    return sql;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set before connecting to the database.",
    );
  }

  sql = postgres(connectionString, { ssl: "require" });
  return sql;
}
