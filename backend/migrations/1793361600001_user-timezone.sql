-- Up Migration
ALTER TABLE users ADD COLUMN time_zone text NOT NULL DEFAULT 'UTC';
-- Down Migration
ALTER TABLE users DROP COLUMN time_zone;
