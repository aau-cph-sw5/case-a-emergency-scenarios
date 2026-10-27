-- Runs once, when a local Postgres container creates its data directory. It makes
-- the application's role usable. Migration V008 grants it what it may do, and
-- creates it without a login if it does not exist yet.
--
-- Development and test only. The password is not a secret: both databases listen
-- on localhost and hold nothing but synthetic data.
CREATE ROLE metro_app LOGIN PASSWORD 'metro_app';
