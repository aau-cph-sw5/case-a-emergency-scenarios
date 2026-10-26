// Never let local integration tests use the application's development database.
// CI supplies its own throwaway database URL; local runs use db-test on port 5433.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://metro:metro@localhost:5433/metro_test";

// Integration tests may run without a developer's local .env file. This value
// is test-only and is loaded before any server module imports auth-service.
process.env.JWT_SECRET ??= "test-only-jwt-secret-not-for-production";
