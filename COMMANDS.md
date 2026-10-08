# Project commands

This file is the central reference for commands used to install, run, check,
format, test, and migrate the project. The real API is a TypeScript Express
application; the fixture-backed stub is a separate development tool.

## First-time setup

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

## Development server

Run the TypeScript Express API in watch mode:

```bash
npm run dev
```

The API listens on `http://localhost:3000`; verify it with
`http://localhost:3000/health`.

Create a production build and run the compiled API:

```bash
npm run build
npm start
```

`npm start` expects the compiled `dist/` output, so run `npm run build` first.

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

The container uses the `POSTGRES_PASSWORD` and `POSTGRES_PORT` values from
your local `.env`. `DATABASE_URL` is also read from that local file when a Node
API route accesses the database.

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
npm run test:integration
```

Tests live in `tests/unit/` and `tests/integration/`. GitHub Actions runs them as
two jobs, so pull requests show separate **Unit tests** and **Integration tests**
statuses. See `docs/reference/automation.md`.

## List available commands

To see all scripts currently defined in `package.json`, run:

```bash
npm run
```
