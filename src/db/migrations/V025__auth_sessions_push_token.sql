-- The FCM token of the steward's phone, for push notifications (ADR 0014,
-- MET-A-018). It lives on the session, so logging out or logging in again stops
-- notifications to the old phone.
ALTER TABLE auth_sessions ADD COLUMN push_token TEXT;
