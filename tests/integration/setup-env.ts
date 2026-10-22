// Never let local integration tests use the application's development database.
// CI supplies its own throwaway database URL; local runs use db-test on port 5433.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://metro:metro@localhost:5433/metro_test";
