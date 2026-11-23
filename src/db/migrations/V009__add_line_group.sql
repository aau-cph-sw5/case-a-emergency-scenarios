ALTER TABLE scenarios
    add COLUMN line_group TEXT NOT NULL
        check (line_group in ('M1_M2', 'M3_M4')),
    ADD CONSTRAINT scenarios_id_line_group_unique
        UNIQUE (scenario_id, line_group);
