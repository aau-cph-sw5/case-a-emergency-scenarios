# Integration tests

Tests for the seams between parts: for example that server responses match the
contract in `contracts/`, or that the seed loader handles bad data.
Name files `*.test.js`, `*.test.mjs` or `*.test.ts`. Run them with `npm run test:integration`.

Some tests use the database. Locally, run `npm run db:up` and `npm run db:migrate`
first, and keep `DATABASE_URL` in your `.env`. In CI, the Integration tests job
starts its own throwaway database and applies every migration before the tests
run.
