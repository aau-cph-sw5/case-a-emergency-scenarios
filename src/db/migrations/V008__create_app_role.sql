-- The application connects as metro_app, not as the owner that Flyway uses.
-- The owner can drop or disable the append-only trigger from V007. metro_app
-- cannot, so a compromised or careless application connection can no longer
-- remove the protection of the incident log.
--
-- The role is created here without a password and without LOGIN, because a
-- password must not be committed. Each environment makes it usable once, outside
-- Flyway: see "Database roles" in docs/reference/incident-log.md. Local and
-- test databases do that in docker/db-init/.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'metro_app') THEN
        CREATE ROLE metro_app NOLOGIN;
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE EXCEPTION
            'The migration user may not create roles. Create metro_app first: CREATE ROLE metro_app LOGIN PASSWORD ''...'';';
END;
$$;

GRANT USAGE ON SCHEMA public TO metro_app;

-- Start from nothing, so the result does not depend on what the role had before.
-- Default privileges (below) survive a Flyway clean. On a database that is reset
-- and migrated again, the tables from V001 to V007 are therefore created with
-- full privileges for metro_app, and the grants below would only add to them.
-- On a new database this revokes nothing.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM metro_app;

-- Tables that exist today get exactly what the application does with them.
-- Reference data is loaded by the seed script, which connects as the owner, so
-- the application only reads it.
GRANT SELECT ON
    scenarios, scenario_versions, stations, track_segments, scenario_covers,
    operating_plans, operating_patterns, line_stops, station_requirements,
    staffing_windows, actions, passenger_information
    TO metro_app;

-- Accounts are created by the seed script, never by the application.
GRANT SELECT ON users TO metro_app;

-- Sessions are created, refreshed and revoked, never deleted.
GRANT SELECT, INSERT, UPDATE ON auth_sessions TO metro_app;

-- INSERT ... RETURNING needs SELECT as well.
GRANT SELECT, INSERT ON position_reports TO metro_app;

-- The log: read and append. No UPDATE, DELETE or TRUNCATE.
GRANT SELECT, INSERT ON incident_events TO metro_app;

-- A table added by a later migration is usable by metro_app without that
-- migration granting it by hand. This applies to tables created by the user
-- that runs this migration, which is the user that runs every migration.
-- A table that must not be changed, like the incident log, revokes what it
-- should not hand out in its own migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO metro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO metro_app;
