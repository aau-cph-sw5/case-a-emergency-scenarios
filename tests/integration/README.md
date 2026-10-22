# Integration tests

Tests for the seams between parts: for example that server responses match the
contract in `contracts/`, or that the seed loader handles bad data.
Name files `*.test.js`, `*.test.mjs` or `*.test.ts`. Run them with `npm run test:integration`.

Some tests use the database. Locally, `npm run test:integration` starts,
resets and migrates its own disposable `metro_test` database on port 5433. It
never writes to the development database configured by `DATABASE_URL` in
`.env`. In CI, the Integration tests job starts its own throwaway database and
applies every migration before the tests run.

Database tests run each test in a transaction that is rolled back, so they leave
no rows behind. Close the connection in `after(() => sql.end())`. See
`incident-log.test.ts`.