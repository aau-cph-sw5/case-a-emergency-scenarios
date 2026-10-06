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

| Command | Purpose |
| --- | --- |
| `npm run db:up` | Start the local PostgreSQL Docker container in the background. Docker Desktop must already be running. |
| `npm run db:migrate` | Apply all pending Flyway migrations. Run after `db:up`. |
| `npm run db:info` | Show the migrations Flyway has recorded for the local database. |
| `npm run db:validate` | Check that the migration files match the recorded history. Run before committing a new migration. |
| `npm run db:down` | Stop and remove the local containers. The PostgreSQL data volume is retained. |

The local connection details are:

```text
Host:     localhost
Port:     5432 (or POSTGRES_PORT in .env)
Database: metro
Username: metro
Password: the POSTGRES_PASSWORD value in .env
```

## Wipe and start fresh

Only do this for the local development database. It permanently deletes the
local PostgreSQL data volume, including Flyway's migration history and any
locally entered data.

```bash
docker compose down -v
npm run db:up
npm run db:migrate
```

Flyway then recreates the database from every migration in `db/migrations`.

## Adding a migration

Create an immutable, versioned file in `db/migrations`:

```text
V002__add_scenario_status.sql
```

Use one new migration for every schema change. Never edit or rename a
migration after it has been applied to a shared environment; create a new
corrective migration instead. Flyway Community runs only these forward
(`V...`) migrations.
