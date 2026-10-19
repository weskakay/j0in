-- Categories become projects, and a board keeps its own focus and capacity
-- figures. Run once in phpMyAdmin on the existing database.

SET NAMES utf8mb4;

ALTER TABLE join_categories
  ADD COLUMN icon        VARCHAR(16)  NULL AFTER color,
  ADD COLUMN description VARCHAR(300) NULL AFTER icon,
  ADD COLUMN status      VARCHAR(16)  NOT NULL DEFAULT 'active' AFTER description,
  ADD COLUMN due_date    DATE         NULL AFTER status,
  ADD COLUMN pinned      TINYINT(1)   NOT NULL DEFAULT 0 AFTER due_date;

ALTER TABLE join_boards
  ADD COLUMN week_capacity INT NOT NULL DEFAULT 32 AFTER time_tracking,
  ADD COLUMN focus_goal    INT NOT NULL DEFAULT 120 AFTER week_capacity,
  ADD COLUMN focus_default INT NOT NULL DEFAULT 25 AFTER focus_goal;
