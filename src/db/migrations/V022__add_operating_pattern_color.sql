ALTER TABLE operating_patterns
    ADD COLUMN color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
