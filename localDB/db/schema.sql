BEGIN;

CREATE TABLE scenarios (
    scenario_id        TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    current_version_id INT
);

CREATE TABLE scenario_versions (
    id          INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    version     TEXT NOT NULL,
    revision    TEXT NOT NULL,
    UNIQUE (scenario_id, version),
    UNIQUE (scenario_id, id)
);

ALTER TABLE scenarios
    ADD FOREIGN KEY (scenario_id, current_version_id)
    REFERENCES scenario_versions (scenario_id, id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE stations (
    id   INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT
);

CREATE TABLE scenario_covers (
    scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    station_id  INT  NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    PRIMARY KEY (scenario_id, station_id)
);

CREATE TABLE operating_plans (
    id                  INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_version_id INT  NOT NULL UNIQUE
                        REFERENCES scenario_versions(id) ON DELETE CASCADE,
    name                TEXT NOT NULL
);

CREATE TABLE operating_patterns (
    id                INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    operating_plan_id INT  NOT NULL REFERENCES operating_plans(id) ON DELETE CASCADE,
    operation_type    TEXT NOT NULL CHECK (operation_type IN ('PENDULUM', 'ROUNDTRIP')),
    route_code        TEXT NOT NULL,
    track             TEXT NOT NULL,
    maximum_trains    INT  NOT NULL CHECK (maximum_trains >= 0),
    did               TEXT NOT NULL,
    description       TEXT
);

CREATE TABLE line_stops (
    id                   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    operating_pattern_id INT NOT NULL REFERENCES operating_patterns(id) ON DELETE CASCADE,
    station_id           INT NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    sequence             INT NOT NULL CHECK (sequence > 0),
    UNIQUE (operating_pattern_id, sequence)
);

CREATE TABLE station_requirements (
    id                  INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_version_id INT  NOT NULL REFERENCES scenario_versions(id) ON DELETE CASCADE,
    station_id          INT  NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    placement           TEXT NOT NULL,
    minimum_staffing    INT  NOT NULL CHECK (minimum_staffing >= 0)
);

CREATE TABLE staffing_windows (
    id                     INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_requirement_id INT  NOT NULL REFERENCES station_requirements(id) ON DELETE CASCADE,
    day_pattern            TEXT NOT NULL,
    start_time             TIME NOT NULL,
    end_time               TIME NOT NULL
);

CREATE TABLE actions (
    id                     INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_requirement_id INT  NOT NULL REFERENCES station_requirements(id) ON DELETE CASCADE,
    sequence               INT  NOT NULL CHECK (sequence > 0),
    instruction            TEXT NOT NULL,
    UNIQUE (station_requirement_id, sequence)
);

CREATE TABLE passenger_information (
    id                  INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_version_id INT  NOT NULL REFERENCES scenario_versions(id) ON DELETE CASCADE,
    channel             TEXT NOT NULL CHECK (channel IN ('PA', 'PID')),
    language            TEXT NOT NULL,
    message             TEXT NOT NULL
);

CREATE INDEX ON scenario_covers (station_id);
CREATE INDEX ON operating_patterns (operating_plan_id);
CREATE INDEX ON line_stops (station_id);
CREATE INDEX ON station_requirements (scenario_version_id);
CREATE INDEX ON station_requirements (station_id);
CREATE INDEX ON staffing_windows (station_requirement_id);
CREATE INDEX ON passenger_information (scenario_version_id);

COMMIT;