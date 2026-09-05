-- Connects an account to a Google calendar and remembers which card belongs
-- to which event. Run once in phpMyAdmin on the existing database.

SET NAMES utf8mb4;

-- One connected Google account per user. The tokens are stored sealed, never
-- in plain text: whoever reads the table still cannot use them.
CREATE TABLE IF NOT EXISTS join_google_accounts (
  user_id       CHAR(36)     NOT NULL PRIMARY KEY,
  email         VARCHAR(190) NOT NULL,
  calendar_id   VARCHAR(190) NOT NULL DEFAULT 'primary',
  access_token  TEXT         NOT NULL,
  refresh_token TEXT         NOT NULL,
  expires_at    DATETIME     NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_google_user FOREIGN KEY (user_id)
    REFERENCES join_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A planned card holds a slot in the day. Deleting the card takes the row with
-- it; the event in Google is removed by the code before that happens.
CREATE TABLE IF NOT EXISTS join_task_events (
  task_id     CHAR(36)     NOT NULL PRIMARY KEY,
  event_id    VARCHAR(190) NOT NULL,
  starts_at   DATETIME     NOT NULL,
  ends_at     DATETIME     NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_event_task FOREIGN KEY (task_id)
    REFERENCES join_tasks(id) ON DELETE CASCADE,
  KEY join_task_events_start_idx (starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
