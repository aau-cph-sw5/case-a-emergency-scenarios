-- A steward's status at a station in an activation (MET-A-015). One row per
-- steward per activation, updated in place; every change is also written to
-- incident_events, which keeps the history.
--
-- Keyed by the activation's sequence (from its SCENARIO_ACTIVATED event), not
-- its activationId: the in-memory activations reuse ids such as ACT-DEMO-001-1
-- after a restart, and a new activation must start with no statuses.
CREATE TABLE steward_statuses (
    activation_sequence BIGINT      NOT NULL,
    activation_id       TEXT        NOT NULL,
    user_id             INTEGER     NOT NULL REFERENCES users (id),
    station             TEXT        NOT NULL,
    status              TEXT        NOT NULL
        CHECK (status IN ('ASSIGNED', 'CHECKED_IN', 'CHECKED_OUT')),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (activation_sequence, user_id)
);

-- The application reads, inserts and updates statuses; it never deletes them.
REVOKE DELETE, TRUNCATE ON steward_statuses FROM metro_app;
