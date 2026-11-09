-- Every user belongs to one line group, either M1_M2 or M3_M4
ALTER TABLE users
  ADD COLUMN line_group TEXT NOT NULL DEFAULT 'M1_M2'
  CHECK (line_group IN ('M1_M2', 'M3_M4'));
