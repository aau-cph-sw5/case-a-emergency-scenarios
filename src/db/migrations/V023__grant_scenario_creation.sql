-- Scenario creation is restricted to admins by the API. Reference network
-- tables remain read-only to the application role.
GRANT INSERT ON scenarios, scenario_versions, operating_patterns, line_stops,
    station_requirements, actions, scenario_covers TO metro_app;
GRANT UPDATE (current_version_id) ON scenarios TO metro_app;
GRANT USAGE, SELECT ON SEQUENCE scenario_versions_id_seq, operating_patterns_id_seq,
    line_stops_id_seq, station_requirements_id_seq, actions_id_seq TO metro_app;
