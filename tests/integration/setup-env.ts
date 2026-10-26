// Never let local integration tests use the application's development database.
// CI supplies its own throwaway database URLs; local runs use db-test on port 5433.
//
// Two roles, as in production: the application connects as metro_app, which
// cannot change the incident log, and the owner migrates the schema. Tests use
// the owner only to set up and clean up rows the application may not touch, and
// to prove what metro_app is refused.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://metro_app:metro_app@localhost:5433/metro_test";
process.env.OWNER_DATABASE_URL =
  process.env.TEST_OWNER_DATABASE_URL ??
  "postgresql://metro:metro@localhost:5433/metro_test";

// Integration tests may run without a developer's local .env file. This value
// is test-only and is loaded before any server module imports auth-service.
process.env.JWT_SECRET ??= "test-only-jwt-secret-not-for-production";
