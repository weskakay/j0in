-- When a card was finished, how long it should take, and focus runs with a
-- fixed length. Run once in phpMyAdmin on the existing database.

SET NAMES utf8mb4;

ALTER TABLE join_tasks
  ADD COLUMN done_at          DATETIME NULL AFTER position,
  ADD COLUMN estimate_minutes INT      NULL AFTER done_at,
  ADD KEY join_tasks_done_idx (done_at);

-- Cards already in the last column of their board count as done from their
-- last change on. Without a stamp they would show up as overdue.
UPDATE join_tasks t
JOIN join_columns c ON c.id = t.column_id
JOIN (SELECT board_id, MAX(position) AS last_position FROM join_columns GROUP BY board_id) l
  ON l.board_id = c.board_id AND l.last_position = c.position
SET t.done_at = t.updated_at
WHERE t.done_at IS NULL;

ALTER TABLE join_time_entries
  ADD COLUMN target_minutes INT NULL AFTER seconds;
