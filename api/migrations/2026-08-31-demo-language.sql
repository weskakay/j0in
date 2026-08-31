-- Marks the cards the demo board is seeded with, so their wording can follow
-- the language a visitor picks. Cards a visitor writes stay untouched.
-- Run once in phpMyAdmin on the existing database.

SET NAMES utf8mb4;

-- Null means the card belongs to whoever wrote it. A number points at the
-- entry in the seed and says: this text may be rewritten.
ALTER TABLE join_tasks
  ADD COLUMN demo_index INT NULL DEFAULT NULL AFTER position;

-- Cards already on the guest board were seeded before this change, but there
-- is no way to tell which any more. They keep their wording until the next
-- reset, which fills the marker in properly.
