-- What a position report says about the steward at the station (contract 7.1.0,
-- MET-A-015). Reports stored before this were all on the way.
ALTER TABLE position_reports
  ADD COLUMN event TEXT NOT NULL DEFAULT 'EN_ROUTE'
  CHECK (event IN ('EN_ROUTE', 'ARRIVED', 'CANCELLED', 'CHECKED_OUT'));
