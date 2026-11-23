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

  // Columns come back in camelCase (server_time → serverTime). Only column names
  // are converted; JSON values such as an event payload are returned unchanged.
  sql = postgres(connectionString, {
    transform: { column: { from: postgres.toCamel, to: postgres.fromCamel } },
  });

  return sql;
}

// Either the shared connection or a transaction from sql.begin(). Functions that
// write take this, so the caller decides which transaction the write belongs to.
export type Db = postgres.Sql | postgres.TransactionSql;
