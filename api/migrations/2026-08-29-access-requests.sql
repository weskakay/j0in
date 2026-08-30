-- Turns registration into a request that has to be approved.
-- Run once in phpMyAdmin on the existing database.

SET NAMES utf8mb4;

-- Every account carries a state. Accounts that existed before this change are
-- already in use, so they are approved outright.
ALTER TABLE join_users
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'approved' AFTER role,
  ADD COLUMN decided_at DATETIME NULL DEFAULT NULL AFTER created_at;

-- Only an owner sees the requests and decides about them. Pick the account
-- that should hold that right; replace the address before running this line.
UPDATE join_users SET role = 'owner' WHERE email = 'DEINE-MAILADRESSE';

-- Finding the open requests has to stay cheap as the table grows.
CREATE INDEX join_users_status_idx ON join_users (status);
