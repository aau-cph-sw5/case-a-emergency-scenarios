-- Preserve the server-generated report ID used by the incident log.
ALTER TABLE position_reports
  ADD COLUMN client_report_id UUID UNIQUE,
  ADD COLUMN client_request_hash TEXT,
  ADD CONSTRAINT position_reports_client_identity_pair CHECK (
    (client_report_id IS NULL) = (client_request_hash IS NULL)
  );