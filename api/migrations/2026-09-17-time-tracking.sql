-- Time tracking on cards. Run once in phpMyAdmin on the existing database.

SET NAMES utf8mb4;

-- The kinds of work time is booked on, editable like the columns.
CREATE TABLE IF NOT EXISTS join_time_phases (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  board_id   CHAR(36)    NOT NULL,
  name       VARCHAR(60) NOT NULL,
  position   INT         NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_phase_board FOREIGN KEY (board_id)
    REFERENCES join_boards(id) ON DELETE CASCADE,
  KEY join_time_phases_board_idx (board_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Time spent on a card. ended_at stays NULL while the timer runs.
CREATE TABLE IF NOT EXISTS join_time_entries (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  task_id    CHAR(36)     NOT NULL,
  phase_id   CHAR(36)     NULL,
  started_at DATETIME     NOT NULL,
  ended_at   DATETIME     NULL,
  seconds    INT          NOT NULL DEFAULT 0,
  note       VARCHAR(200) NULL,
  CONSTRAINT join_fk_time_task FOREIGN KEY (task_id)
    REFERENCES join_tasks(id) ON DELETE CASCADE,
  CONSTRAINT join_fk_time_phase FOREIGN KEY (phase_id)
    REFERENCES join_time_phases(id) ON DELETE SET NULL,
  KEY join_time_entries_task_idx (task_id, started_at),
  KEY join_time_entries_running_idx (ended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The four starting phases for every board that already exists. The guest
-- board gets them in its own language again with the next daily reset.
INSERT INTO join_time_phases (id, board_id, name, position)
SELECT UUID(), b.id, p.name, p.position
FROM join_boards b
JOIN (
  SELECT 'Planen' AS name, 1 AS position
  UNION ALL SELECT 'Umsetzen', 2
  UNION ALL SELECT 'Testen', 3
  UNION ALL SELECT 'Recherche', 4
) p
WHERE NOT EXISTS (SELECT 1 FROM join_time_phases x WHERE x.board_id = b.id);

-- The switch in the settings, under features. On for every board that exists,
-- so nobody loses the timer by running this.
ALTER TABLE join_boards
  ADD COLUMN time_tracking TINYINT(1) NOT NULL DEFAULT 1 AFTER is_demo;
