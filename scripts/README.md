# TypeScript seed loader

the seed loader has been developed in TypeScript, it is responsible for gathering data from the seed data files and loading it into the database thereby populating it.

## Pre-requisites

    - .env file, this is necessary due to it carrying the postgres port and password
    - SeedDataScenario_(n).json and stations.json, this is the data the actual seed loader makes us of so you will need to fetch it from the project one drive, these should be placed in docs/scenario-state.
    - Docker set up and running, download and set up docker as explained in db/README.md

## Running the seedloader

    after docker has been run and the migration files have been also been run, you can now populate the database.

**bash**

    npm run seed
        - this command in itself acutally loads the data, the expected output with one seed data file should be "Seeded 1 scenario", one per file. Running it twice is safe and will not create duplicates

## checking the result

command to show rows
    **bash**
    docker compose exec db psql -U metro -c "SELECT
        (SELECT count(*) FROM scenarios) AS scenarios,
        (SELECT count(*) FROM scenario_versions) AS versions,
        (SELECT count(*) FROM operating_patterns) AS patterns,
        (SELECT count(*) FROM line_stops) AS stops,
        (SELECT count(*) FROM stations) AS stations,
        (SELECT count(*) FROM station_requirements) AS reqs,
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
