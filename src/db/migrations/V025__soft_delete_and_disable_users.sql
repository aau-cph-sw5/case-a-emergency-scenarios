-- An admin can delete or disable an account (MET-A-030). Neither can sign in.
-- A deleted account keeps its row, so the activations and log events that
-- point to it keep their user; it is only left out of the admin's list.
-- A disabled account is still listed and can be enabled again.
ALTER TABLE users
    ADD COLUMN deleted_at TIMESTAMPTZ,
    ADD COLUMN is_disabled BOOLEAN NOT NULL DEFAULT FALSE;
