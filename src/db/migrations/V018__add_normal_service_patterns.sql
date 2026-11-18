-- A pattern belongs either to a scenario version or to a normal metro line.
ALTER TABLE operating_patterns
    ALTER COLUMN scenario_version_id DROP NOT NULL,
    ADD COLUMN normal_line TEXT CHECK (normal_line IN ('M1', 'M2', 'M3', 'M4')),
    ADD CONSTRAINT operating_patterns_one_owner_check
        CHECK ((scenario_version_id IS NOT NULL) <> (normal_line IS NOT NULL));

CREATE INDEX ON operating_patterns (normal_line) WHERE normal_line IS NOT NULL;
