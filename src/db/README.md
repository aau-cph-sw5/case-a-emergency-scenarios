
# Local database migrations

This folder contains versioned Flyway migrations for the application's
transactional PostgreSQL database. It contains only schema definitions and
synthetic/local development configuration; never commit Metro material or
production credentials here.

## First run

1. Install Docker Desktop and ensure it is running.

   If Docker Desktop on Windows reports **"Virtualization support not
   detected"**, open PowerShell as Administrator, run the following commands,
   then restart the PC:

   ```powershell
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   bcdedit /set hypervisorlaunchtype auto
   ```

2. Copy the local-only environment template:

   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL and apply the migrations:

   ```bash
   npm run db:up
   npm run db:migrate
   ```

4. Check the recorded migration history:

   ```bash
   npm run db:info
   ```


Run `npm run db:validate` before committing a new migration. Stop the local
database with `npm run db:down`; its Docker volume is retained, so your local
schema history remains intact.

## Commands

| Command                                         | Purpose                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run db:up`                                 | Start the local PostgreSQL Docker container in the background. Docker Desktop must already be running. |
| `npm run db:migrate`                            | Apply all pending Flyway migrations. Run after `db:up`.                                                |
| `npm run db:info`                               | Show the migrations Flyway has recorded for the local database.                                        |
| `npm run db:validate`                           | Check that the migration files match the recorded history. Run before committing a new migration.      |
| `npm run db:down`                               | Stop and remove the local containers. The PostgreSQL data volume is retained.                          |
| `npm run db:test:up`                            | Start the disposable integration-test PostgreSQL container on port 5433.                               |
| `npm run db:test:reset`                         | Delete and recreate only the test database schema, then apply every migration.                         |
| `npm run db:test:down`                          | Stop the integration-test container. Its test-data volume is retained.                                 |
| `docker compose exec db psql -U metro -c "\dt"` | See all tables in database.                                                                            |

The local connection details are:

```text
Host:     localhost
Port:     5432 (or POSTGRES_PORT in .env)
Database: metro
Username: metro
Password: the POSTGRES_PASSWORD value in .env
```

Integration tests use a separate, disposable database:

```text
Host:     localhost
Port:     5433
Database: metro_test
Username: metro
Password: metro
```

`npm run test:integration` starts it, clears only its schema, applies every
migration and runs the tests. It never uses `DATABASE_URL` from `.env`, so it
cannot write test users or scenarios into the local development database.

## Wipe and start fresh

Only do this for the local development database. It permanently deletes the
local PostgreSQL data volume, including Flyway's migration history and any
locally entered data.

```bash
docker compose down -v
npm run db:up
npm run db:migrate
```

Changing POSTGRES_PASSWORD in .env only takes effect on a fresh volume. If you change it, run the wipe steps above
Flyway then recreates the database from every migration in `src/db/migrations`.

## Adding a migration

Create an immutable, versioned file in `src/db/migrations`:

```text
V002__add_scenario_status.sql
```

Use one new migration for every schema change. Never edit or rename a
migration after it has been applied to a shared environment; create a new
corrective migration instead. Flyway Community runs only these forward
(`V...`) migrations.

Migration versions must start at `V001` and be consecutive. The project
convention is to use three digits, so after `V004__...sql`, write the next
migration as `V005__...sql`. Leading zeroes do not make a distinct version, so `V005`, `V5`, and
`V0000005` cannot coexist. GitHub checks this on pull requests and merge-queue
runs; run
`npm run db:check-versions` locally to check it before pushing.
