-- Two things the guest area needs. Run once in phpMyAdmin on the existing
-- database, then set calendar_enabled to 1 for your own account.

SET NAMES utf8mb4;

-- The day the demo board was last put back. A visitor may change everything;
-- the first visit of a new day finds it the way it was meant to be found.
ALTER TABLE join_boards
  ADD COLUMN demo_reset_on DATE NULL AFTER is_demo;

-- Who may reach the calendar at all. Off for everybody, including the shared
-- guest, so opening it up later is a row to change, not code to deploy.
ALTER TABLE join_users
  ADD COLUMN calendar_enabled TINYINT(1) NOT NULL DEFAULT 0;

-- Your own account. Put your address in before running this line.
-- UPDATE join_users SET calendar_enabled = 1 WHERE email = 'you@example.org';
