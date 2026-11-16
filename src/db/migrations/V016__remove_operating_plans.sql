-- The current API still exposes an operating plan name for each version.
ALTER TABLE scenario_versions ADD COLUMN operating_plan_name TEXT;

ALTER TABLE operating_patterns
    ADD COLUMN scenario_version_id INT NOT NULL
        REFERENCES scenario_versions(id) ON DELETE CASCADE;

CREATE INDEX ON operating_patterns (scenario_version_id);

ALTER TABLE operating_patterns DROP COLUMN operating_plan_id;
DROP TABLE operating_plans;
