CREATE TABLE incident_events (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence       BIGINT      GENERATED ALWAYS AS IDENTITY UNIQUE,
    type           TEXT        NOT NULL CHECK (type ~ '^[A-Z][A-Z0-9_]*$'),
    schema_version INT         NOT NULL CHECK (schema_version > 0),
    actor_type     TEXT        NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM')),
    actor_id       TEXT        NOT NULL,
    actor_role     TEXT,
    subject_type   TEXT        NOT NULL,
    subject_id     TEXT        NOT NULL,
    activation_id  TEXT,
    line           TEXT,
    payload        JSONB       NOT NULL DEFAULT '{}'::jsonb
                               CHECK (jsonb_typeof(payload) = 'object'),
    server_time    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    client_time    TIMESTAMPTZ,
    CHECK ((actor_type = 'USER') = (actor_role IS NOT NULL))
);

CREATE INDEX ON incident_events (activation_id, sequence);
CREATE INDEX ON incident_events (line, server_time);
