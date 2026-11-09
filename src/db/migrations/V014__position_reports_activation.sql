-- The activation a report was made against; empty for older reports.
ALTER TABLE position_reports
  ADD COLUMN activation_id INTEGER REFERENCES incident_activations (id);

CREATE INDEX ON position_reports (activation_id);
