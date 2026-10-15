
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

**outdated**
   # seed-scenarios.ts and V002__load_scenario.sql
   
   the seed loader fills the local database with the scenarios stored as JSON files, should any changes occur to the scenarios, run the loader again. 
   The loader logic is split into 2 different files a TypeScript file and a SQL file.

   ## seed-scenarios.ts
   this file is responsible for:
      - find every JSON file located in **docs/scenario-state**
      - read and parse every file
      - validate data, if there are any inconsistencies in the data, they will be found here and printed and not pushed to the db
      - connects to the database 
      - commits if all checks pass and doesnt if any fail

   ## V002__load_scenario.sql
      - deletes any old versions of the scenario
      - inserts the scenario itself
         - this includes data such as: each covered track segment, each version and its attached operating plan and the staffing requirements
      
   ## running the loader
      - run the db as shown above
      - then run **bash** npm run seed
      - expected output with 1st scenario should be **seeded 1 scenario(s).**

      to correct a scenario change the JSON file and run **bash** npm run seed.
      to make a new scenario create a new file with the name SeedDataScenario_<n>.json in docs/scenario-state with a scenario id not used by another scenario, the run **npm run seed**

      to print the entire table run:
      **bash**
      docker compose exec db psql -U metro -c "SELECT
         (SELECT count(*) FROM scenarios) AS scenarios,
         (SELECT count(*) FROM scenario_versions) AS versions,
         (SELECT count(*) FROM operating_plans) AS plans,
         (SELECT count(*) FROM operating_patterns) AS patterns,
         (SELECT count(*) FROM line_stops) AS stops,
         (SELECT count(*) FROM stations) AS stations,
         (SELECT count(*) FROM track_segments) AS segments,
         (SELECT count(*) FROM scenario_covers) AS covers,
         (SELECT count(*) FROM station_requirements) AS reqs,
         (SELECT count(*) FROM staffing_windows) AS windows,
         (SELECT count(*) FROM actions) AS actions,
         (SELECT count(*) FROM passenger_information) AS pax;"

      to print just one row run:
      **bash**
         docker compose exec db psql -U metro -c "SELECT * FROM line_stops LIMIT 1;"

**outdated**



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
| `docker compose exec db psql -U metro -c "\dt"` | See all tables in database. |

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

