BEGIN;

CREATE TABLE scenarios (
    scenario_id TEXT PRIMARY KEY,
    name        TEXT NOT NULL
);

CREATE TABLE scenario_versions (
    id          INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    version     TEXT NOT NULL,
    revision    TEXT,
    UNIQUE (scenario_id, version)
);

CREATE TABLE stations (
    id   INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
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
    route_code        TEXT,
    track             TEXT,
    maximum_trains    INT  CHECK (maximum_trains > 0),
    did               TEXT,
    description       TEXT
);

CREATE TABLE line_stops (
    id                   INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    operating_pattern_id INT  NOT NULL REFERENCES operating_patterns(id) ON DELETE CASCADE,
    station_id           INT  NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    sequence             INT  NOT NULL CHECK (sequence > 0),
    station_role         TEXT NOT NULL CHECK (station_role IN ('TERMINUS', 'TURNAROUND', 'STOP')),
    UNIQUE (operating_pattern_id, sequence)
);

CREATE TABLE station_requirements (
    id                  INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_version_id INT  NOT NULL REFERENCES scenario_versions(id) ON DELETE CASCADE,
    station_id          INT  NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    placement           TEXT,
    minimum_staffing    INT  NOT NULL DEFAULT 0 CHECK (minimum_staffing >= 0)
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

CREATE INDEX ON operating_patterns (operating_plan_id);
CREATE INDEX ON line_stops (station_id);
CREATE INDEX ON station_requirements (scenario_version_id);
CREATE INDEX ON station_requirements (station_id);
CREATE INDEX ON staffing_windows (station_requirement_id);
CREATE INDEX ON passenger_information (scenario_version_id);

COMMIT;