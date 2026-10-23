-- The incident log only ever grows. The application has no code path that
-- changes or removes an event, but that alone can be bypassed by a later
-- migration or a direct SQL connection, so the database refuses it too.
--
-- A trigger is used instead of revoking privileges, because it holds for
-- whichever database user connects. It does not hold against a superuser or
-- the table owner, who can drop the trigger. Dropping the table or schema
-- (db:reset, Flyway clean) is not blocked either.

CREATE FUNCTION reject_incident_event_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'incident_events is append-only: % is not allowed', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER incident_events_reject_update_delete
    BEFORE UPDATE OR DELETE ON incident_events
    FOR EACH ROW EXECUTE FUNCTION reject_incident_event_change();

CREATE TRIGGER incident_events_reject_truncate
    BEFORE TRUNCATE ON incident_events
    FOR EACH STATEMENT EXECUTE FUNCTION reject_incident_event_change();
