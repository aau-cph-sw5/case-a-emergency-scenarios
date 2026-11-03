# TypeScript seed loader

the seed loader has been developed in TypeScript, it is responsible for gathering data from the seed data files and loading it into the database thereby populating it.

## Pre-requisites

    - .env file, this is necessary due to it carrying the postgres port and password
    - SeedDataScenario_(n).json, this is the data the actual seed loader makes use of so you will need to fetch it from the project one drive. Each scenario needs a `lineGroup` of `M1_M2` or `M3_M4`. Put the files in a folder OUTSIDE the repository and set SEED_SCENARIOS_DIR in .env to that folder, e.g. SEED_SCENARIOS_DIR=C:/Users/you/Documents/metro-seed-data. `npm run seed` stops if it is not set.
        - stations.json and shafts.json are part of the repository, in docs/scenario-state.
    - Docker set up and running, download and set up docker as explained in db/README.md

## Running the seedloader

    after docker has been run and the migration files have been also been run, you can now populate the database.

**bash**

    npm run seed

Reseeding updates the scenarios and versions in the supplied files, including versions referenced by activation history. Other scenarios and versions are left in place. The `currentVersion` in each file becomes that scenario's current version. Changing a scenario's line group can fail if an activation references it.

## checking the result

command to show rows
**bash**
docker compose exec db psql -U metro -c "SELECT
(SELECT count(_) FROM scenarios) AS scenarios,
(SELECT count(_) FROM scenario_versions) AS versions,
(SELECT count(_) FROM operating_patterns) AS patterns,
(SELECT count(_) FROM line_stops) AS stops,
(SELECT count(_) FROM stations) AS stations,
(SELECT count(_) FROM station_requirements) AS reqs,
(SELECT count(*) FROM passenger_information) AS pax;"

command to show version
**bash**  
docker compose exec db psql -U metro -c "SELECT s.scenario_id, v.version FROM scenarios s JOIN scenario_versions v ON v.id = s.current_version_id;"

command to list all tables
**bash**
docker compose exec db psql -U metro -c "\dt"

command to stop database
**base**
npm run db:down
