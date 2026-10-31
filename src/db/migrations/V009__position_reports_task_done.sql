-- A position report can say the steward has finished the task at the station
-- (MET-A-015).
ALTER TABLE position_reports ADD COLUMN task_done BOOLEAN NOT NULL DEFAULT false;
