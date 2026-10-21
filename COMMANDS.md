# Project commands

This file is the central reference for commands used to install, run, check,
format, test, and migrate the project. The real API is a TypeScript Express
application; the fixture-backed stub is a separate development tool.

## First-time setup

Prepare everything for local development with one command:

```bash
npm run setup
```

This installs dependencies when `package-lock.json` has changed, creates
`.env` from `.env.example` if it is missing, starts the local PostgreSQL
container, applies the Flyway migrations, and seeds scenario data when the seed
files are present in `docs/scenario-state/`. Docker Desktop must be running.
Every step skips work that is already done, so re-run it after pulling.

The individual steps are described below for when you need to run one on its
own.

Install the exact dependency versions recorded in `package-lock.json`:

```bash
npm ci
```

Use `npm ci` after cloning the repository or when you want a clean dependency
installation.

Create your local environment file before starting the database or API:

```bash
cp .env.example .env
```

## Code-quality checks

Run all code-quality checks locally with one command:

```bash
npm run check
```

This runs ESLint, checks formatting with Prettier, and type-checks the
TypeScript API. A summary at the end shows whether each check passed. The
command fails if any check finds a problem.

GitHub Actions runs the same checks as independent jobs so pull requests show
separate **ESLint**, **Prettier**, and **TypeScript** statuses.

Run ESLint only:

```bash
npm run lint
```

Check formatting without modifying files:

```bash
npm run format:check
```

Apply Prettier formatting automatically:

```bash
npm run format
```

Apply ESLint's safe automatic fixes:

```bash
npm run lint -- --fix
```

Run only the TypeScript type check:

```bash
npm run typecheck
```

## Development servers

Run the TypeScript Express API and browser app in watch mode:

```bash
npm run dev:web
```

The browser-based web client runs at `http://localhost:5173`. The API and
Socket.IO server run at `http://localhost:3000`; verify the API with
`http://localhost:3000/healthcheck`.

To run only the API in watch mode:

```bash
npm run dev
```

The API listens on `http://localhost:3000`; verify it with
`http://localhost:3000/healthcheck`.

Create a production build and run the compiled application:

```bash
npm run build
npm start
```

`npm run build` creates both the compiled API in `dist/` and the browser-based
web client build in `web/dist/`. `npm start` serves the web client, API, and
Socket.IO from the same port. Run `npm run mobile` in another terminal to start
the separate native Expo mobile app.

## Hosted staging and production

The project uses one Render Node service per environment. Each service serves
the browser-based web client, API, and Socket.IO endpoint at its own public
URL; no separate Socket.IO service is required. The native mobile app is built
separately as an Expo/Android artifact and connects to that URL.

Configure both Render services with:

```text
Build Command: npm ci && npm run build
Start Command: npm start
```

Render supplies `PORT` automatically. The staging service should deploy the
`staging` branch and the production service should deploy `main`. The deployed
web client connects to Socket.IO on its own origin automatically.

For Expo to use a hosted environment, set the matching URL in the local root
`.env` before starting or building the mobile app:

```env
# Staging example
API_URL=https://case-a-emergency-scenarios-staging.onrender.com
```

Use the production service URL for a production mobile build. Do not commit
`.env`.

## Local database and Flyway migrations

Start the local PostgreSQL container:

```bash
npm run db:up
```

Apply, inspect, or validate Flyway migrations:

```bash
npm run db:migrate
npm run db:info
npm run db:validate
```

Stop the local database container:

```bash
npm run db:down
```

Delete the local database, including all its data, and rebuild it from the
migrations and seed data:

```bash
npm run db:reset
```

The container uses the `POSTGRES_PASSWORD` and `POSTGRES_PORT` values from
your local `.env`. `DATABASE_URL` is also read from that local file when a Node
API route or an integration test accesses the database.

Seed local users for database-backed authentication after applying migrations:

```bash
npm run seed:users
```

This creates or updates the local-only accounts `steward-test` /
`steward-test-pw` and `operator-test` / `operator-test-pw`. Do not use these
credentials outside local development.

## Hosted staging and production migrations

GitHub Actions runs Flyway automatically when a commit reaches `staging` or
`main`. The job selects the existing GitHub environment named `StagingEnv` for
the staging branch and `ProductionEnv` for the main branch.

## Fixture-backed stub API

Run the temporary fixture-backed API used for contract and frontend work:

```bash
npm run stub
```

Run an OpenAPI mock instead:

```bash
npm run stub:prism
```

The stub is separate from the real Express API. It contains two local-only test
accounts for frontend and contract testing; it does not create PostgreSQL users
or configure production authentication.

Regenerate the stub accounts only when needed:

```bash
npm run seed:accounts
```

This overwrites `fixtures/v1/test-accounts.json` with the same two usernames
and roles but new bcrypt hashes, so it normally creates a Git change.

Validate fixture data:

```bash
npm run validate
```

## Tests
Run all unit and integration tests:

```bash
npm test
```

Run only one level:

```bash
npm run test:unit
npm run test:jest
npm run test:integration
```

Some integration tests use the database. Start and migrate it first:

```bash
npm run db:up
npm run db:migrate
```

Tests live in `tests/unit/`, `tests/jest/` and `tests/integration/`. GitHub Actions runs them as
separate **Unit tests** **Jest tests** and  **Integration tests** checks, against a throwaway
database, and reports coverage as a third check, **Backend coverage**. See
`docs/reference/automation.md`.

## Generate:

Generates typescript types from the json schemas, in the `contracts/` folder, preferably use these 
so the contracts serves as a source of truth.

```bash
npm run generate:types
```

## List available commands

To see all scripts currently defined in `package.json`, run:

```bash
npm run
```
