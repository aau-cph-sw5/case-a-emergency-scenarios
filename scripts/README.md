# TypeScript seed loader

The seed loader (`scripts/seed-scenarios.ts`) reads the scenario seed data files, checks them, and loads them into the local database. The website and the API then read the scenarios from that database.

The scenario files are private Metro material. They are not in git and must never be added to the repository.

## Prerequisites

- The local setup has run (`npm run setup`), so `.env` exists and the database is running in Docker. See [src/db/README.md](../src/db/README.md).
- `stations.json` and `shafts.json` are already in the repository, in `docs/scenario-state/`. You do not need to fetch them.

## 1. Get the seed data

1. Open the project OneDrive and download the folder **Current Seed data to use (up to date)**. It downloads as a zip file.
2. Unzip it.

Only use the files from that folder. Do not mix in older versions of a scenario.

## 2. Put the files outside the repository

Move the unzipped folder to a place **outside** `case-a-emergency-scenarios`, for example:

- macOS: `/Users/you/metro-seed-data`
- Windows: `C:/Users/you/metro-seed-data`

Keeping the folder outside the repository means the files can never be committed by mistake, whatever they are called. `npm run seed` refuses to run if `SEED_SCENARIOS_DIR` points inside the repository.

The loader reads every file in the folder whose name starts with `SeedDataScenario_` and ends with `.json`. Other files are ignored. Keep only one file per scenario in the folder: two files with the same `scenarioId` stop the run.

## 3. Point `.env` to the folder

In `.env`, set `SEED_SCENARIOS_DIR` to the full path of the folder. Use forward slashes, also on Windows:

```
SEED_SCENARIOS_DIR=/Users/you/metro-seed-data
```

## 4. Run the seed loader

```bash
npm run seed
```

When it works, the last line is:

```
Seeded 3 scenario(s) into localhost:5432/metro.
```

The number is the number of scenario files in the folder, and the end says which database they went into.

The loader checks all files before it writes anything. If one file is invalid, it prints every problem it found and writes nothing.

The error messages can contain station codes and other values from the private files. Do not paste the output into a pull request, an issue or Discord.

Reseeding updates the scenarios and versions in the supplied files, including versions referenced by activation history. Other scenarios and versions are left in place. The `currentVersion` in each file becomes that scenario's current version. Changing a scenario's line group can fail if an activation references it.

## Demo data without the private files

To try the app without the Metro seed data, load the three public, synthetic scenarios `DEMO-001` to `DEMO-003` from `fixtures/v1/scenarios/`:

```bash
npm run seed:demo
```

It needs no `SEED_SCENARIOS_DIR`. The stations `Station A` to `Station G` come from `fixtures/v1/demo-stations.json`, which the integration tests also use.

The demo scenarios are added next to any real scenarios already in the database, so the app then lists both. To start again with only the real data, run `npm run db:reset` and then `npm run seed`.

## Seeding another database, for example staging

By default the seed writes to the local Docker database. To write to another one, set `SEED_DATABASE_URL` in `.env` to that database's address, with the owner's user:

```
SEED_DATABASE_URL=postgresql://user:password@host:5432/database
```

Then `npm run seed` and `npm run seed:demo` write there, and the last line names that host. Remove the line again to go back to the local database. `npm run setup` never seeds while `SEED_DATABASE_URL` is set.

- The address contains a password. Keep it only in your own `.env`, never in a file in git.
- Real Metro scenarios may not be seeded into an online database without the Product Owner's approval. Use `npm run seed:demo` for staging until then.
- The seed refuses to run when `NODE_ENV=production`.

## If it fails

| Error                                                    | What to do                                                                                                                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SEED_SCENARIOS_DIR is not set`                          | Add the line from step 3 to `.env`.                                                                                                                                                                                                     |
| `SEED_SCENARIOS_DIR ... is inside this repository`       | Move the folder outside the repository, as in step 2, and update the path in `.env`.                                                                                                                                                    |
| `SEED_SCENARIOS_DIR points to ..., which does not exist` | Check the path in `.env` for typos.                                                                                                                                                                                                     |
| `No SeedDataScenario_*.json files in ...`                | Check that the path in `.env` is the folder that holds the files, not the folder above it or the zip file.                                                                                                                              |
| `... is not valid JSON (at line ... column ...)`         | The file is broken, for example by a missing comma. Open it in an editor at that line, or download it again.                                                                                                                            |
| `unknown station "..."` or `unknown shaft code "..."`    | The file uses a code that is not in `docs/scenario-state/stations.json` or `shafts.json`. Check that you have the newest files from step 1.                                                                                             |
| `scenarioId "..." is already used in ...`                | Two files contain the same scenario. Keep only the newest one.                                                                                                                                                                          |
| `EPERM: operation not permitted` (macOS)                 | macOS can block the terminal from reading `~/Documents`, `~/Desktop` and `~/Downloads`. Move the folder to one outside these, as in step 2, or give the terminal access under System Settings → Privacy & Security → Files and Folders. |
| `POSTGRES_PASSWORD is not set`                           | `.env` is missing. Run `npm run setup`.                                                                                                                                                                                                 |
| `connect ECONNREFUSED` or a timeout                      | The database is not running. Start Docker, then run `npm run setup` again.                                                                                                                                                              |

## Checking the result

Count the rows in each table. It prints one row with seven columns:

```bash
docker compose exec db psql -U metro -c "SELECT
(SELECT count(*) FROM scenarios) AS scenarios,
(SELECT count(*) FROM scenario_versions) AS versions,
(SELECT count(*) FROM operating_patterns) AS patterns,
(SELECT count(*) FROM line_stops) AS stops,
(SELECT count(*) FROM stations) AS stations,
(SELECT count(*) FROM station_requirements) AS reqs,
(SELECT count(*) FROM passenger_information) AS pax;"
```

Show the current version of each scenario:

```bash
docker compose exec db psql -U metro -c "SELECT s.scenario_id, v.version FROM scenarios s JOIN scenario_versions v ON v.id = s.current_version_id;"
```

List all tables:

```bash
docker compose exec db psql -U metro -c "\dt"
```

Stop the database:

```bash
npm run db:down
```
