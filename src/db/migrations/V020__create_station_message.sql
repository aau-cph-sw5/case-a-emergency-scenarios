CREATE TABLE station_messages (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_message_id UUID NOT NULL UNIQUE,
    activation_id INTEGER NOT NULL REFERENCES incident_activations(id) ON DELETE CASCADE,
    station TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('STATION', 'CONTROL_ROOM')),

    text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 1000 AND text ~ '[^[:space:]]'),

    written_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX station_messages_activation_station_id
    ON station_messages (activation_id, station, id);

-- The application may append/read messages but must not edit or delete them.
REVOKE UPDATE, DELETE, TRUNCATE ON station_messages FROM metro_app;