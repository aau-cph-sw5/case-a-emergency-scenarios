CREATE TABLE incident_activations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_version_id INTEGER NOT NULL,
    scenario_id TEXT NOT NULL,
    line_group TEXT NOT NULL,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMPTZ,
    activated_by INTEGER NOT NULL REFERENCES users(id),
    CHECK (deactivated_at >= activated_at),

    FOREIGN KEY (scenario_id, scenario_version_id)
        REFERENCES scenario_versions (scenario_id, id),

    FOREIGN KEY (scenario_id, line_group)
        REFERENCES scenarios (scenario_id, line_group)
);

CREATE UNIQUE INDEX one_active_incident_per_group
    ON incident_activations (line_group)
    WHERE deactivated_at IS NULL;

REVOKE DELETE, TRUNCATE ON incident_activations FROM metro_app;
