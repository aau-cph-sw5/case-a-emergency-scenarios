-- The activation a report was made against.
ALTER TABLE position_reports
  ADD COLUMN activation_id INTEGER REFERENCES incident_activations (id);

-- Older reports get the activation that was running when they arrived.
UPDATE position_reports AS report
SET activation_id = (
  SELECT activation.id
  FROM incident_activations AS activation
  WHERE activation.activated_at <= report.received_at
    AND (activation.deactivated_at IS NULL
         OR activation.deactivated_at >= report.received_at)
  ORDER BY activation.activated_at DESC
  LIMIT 1
);

-- Reports made while no scenario was active can't be tied to an activation.
DELETE FROM position_reports WHERE activation_id IS NULL;

ALTER TABLE position_reports ALTER COLUMN activation_id SET NOT NULL;

CREATE INDEX ON position_reports (activation_id);
