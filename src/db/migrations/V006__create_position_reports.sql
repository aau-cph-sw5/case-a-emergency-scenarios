CREATE TABLE position_reports (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    staff       TEXT        NOT NULL,
    station     TEXT        NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX ON position_reports (station, reported_at);
