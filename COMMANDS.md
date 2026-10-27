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
`.env` from `.env.example` if it is missing, generates a local `JWT_SECRET`
when it is blank, starts the local PostgreSQL container, applies the Flyway
migrations, and seeds scenario data when the seed files are present in
`docs/scenario-state/`. Docker Desktop must be running. Every step skips work
that is already done, so re-run it after pulling.

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

Set `DATABASE_URL` on each service to the connection string of that
environment's own database, the one the migrations below are applied to, but
with the `metro_app` user, not the owner that Flyway uses. See
[Database roles](#database-roles). Routes that use the database fail without
it; `POST /api/v1/position-reports` is the first.

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
migrations and seed data. It asks for confirmation first; add `-- --yes` to
skip the question, for example in a script:

```bash
npm run db:reset
npm run db:reset -- --yes
```

The container uses the `POSTGRES_PASSWORD` and `POSTGRES_PORT` values from
your local `.env`. `DATABASE_URL` is also read from that local file when a Node
API route accesses the database, as the `metro_app` user (see
[Database roles](#database-roles)). Integration tests use a separate local
database and never write to this one.

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

## Database roles

Two database users connect. Flyway, the seed scripts and the test fixtures use
the **owner** (`FLYWAY_USER` on the hosted environments, `metro` locally). The
application uses **`metro_app`** through `DATABASE_URL`. `metro_app` can read and
append to the incident log but can't change it, drop its triggers, or change the
schema. What it may do with each table is in `docs/reference/incident-log.md`.

Migration `V008` creates `metro_app` without a password or login, and grants it
its privileges. Making it usable is a one-off step per environment, because a
password can't be committed.

Locally nothing is needed on a new database: `docker/db-init/` creates
`metro_app` with the password `metro_app` the first time the container starts.
`DATABASE_URL` in `.env.example` points at it. A local database created before
this change has no login for the role. Either rebuild it with
`npm run db:reset`, or keep your data and run:

```bash
docker compose exec db psql -U metro -d metro -c "ALTER ROLE metro_app LOGIN PASSWORD 'metro_app'"
```

Then change `DATABASE_URL` in your `.env` to
`postgresql://metro_app:metro_app@localhost:5432/metro`.

On staging, and then production, someone with owner access to the database does
this once, and then points the Render service at the new user:

1. Before the migration runs, or after it (the migration creates the role if it
   is missing and the owner may create roles), set a login and a generated
   password:

   ```sql
   -- Run as the owner, e.g. with psql. Use a generated password, not this one.
   CREATE ROLE metro_app LOGIN PASSWORD '<generated>';     -- if it does not exist yet
   ALTER ROLE metro_app LOGIN PASSWORD '<generated>';      -- if V008 already created it
   ```

2. Set `DATABASE_URL` on the Render service to the same database with
   `metro_app` and that password. Redeploy.
3. Leave `FLYWAY_URL`, `FLYWAY_USER` and `FLYWAY_PASSWORD` in `StagingEnv` and
   `ProductionEnv` as they are.
4. Check that it holds: connect as `metro_app` and run
   `UPDATE incident_events SET type = type;`. It must fail with
   `permission denied for table incident_events`.

If the hosted Postgres doesn't let the owner create roles, the V008 migration
fails with a message saying so. Create the role first, as in step 1, and
re-run the migration.

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

Integration tests start, reset and migrate their own disposable `metro_test`
database automatically. They migrate as the owner and connect as `metro_app`,
like the hosted application. They do not write to the local development database.
Use `npm run db:test:down` afterwards if you want to stop its container.

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
