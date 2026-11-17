-- Admins create and edit accounts on the dashboard (MET-A-030), so the
-- application may now insert and update users, which V008 kept to the seed
-- script. Admins can't delete accounts for now.
GRANT INSERT, UPDATE ON users TO metro_app;
