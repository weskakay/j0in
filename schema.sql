-- J0IN schema for MySQL, shares the database with the Poll-App.
-- Every table, index and foreign key carries the join_ prefix.
-- Run once in phpMyAdmin on the existing database.

SET NAMES utf8mb4;

-- Who can sign in. Guests get role = 'guest'.
CREATE TABLE IF NOT EXISTS join_users (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(16)  NOT NULL DEFAULT 'user',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY join_users_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login sessions. Only the hash of the token is stored, never the token.
CREATE TABLE IF NOT EXISTS join_sessions (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_session_user FOREIGN KEY (user_id)
    REFERENCES join_users(id) ON DELETE CASCADE,
  KEY join_sessions_token_idx (token_hash),
  KEY join_sessions_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One board per user for now; the table allows more later.
CREATE TABLE IF NOT EXISTS join_boards (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  owner_user_id CHAR(36)     NOT NULL,
  name          VARCHAR(120) NOT NULL,
  is_demo       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_board_user FOREIGN KEY (owner_user_id)
    REFERENCES join_users(id) ON DELETE CASCADE,
  KEY join_boards_owner_idx (owner_user_id),
  KEY join_boards_demo_idx (is_demo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Freely definable columns. Seeded with the four familiar ones.
CREATE TABLE IF NOT EXISTS join_columns (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  board_id   CHAR(36)    NOT NULL,
  name       VARCHAR(80) NOT NULL,
  position   INT         NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_column_board FOREIGN KEY (board_id)
    REFERENCES join_boards(id) ON DELETE CASCADE,
  KEY join_columns_board_idx (board_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories are editable like columns, seeded with the two familiar ones.
CREATE TABLE IF NOT EXISTS join_categories (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  board_id   CHAR(36)    NOT NULL,
  name       VARCHAR(80) NOT NULL,
  color      CHAR(7)     NOT NULL DEFAULT '#1FD7C1',
  position   INT         NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_category_board FOREIGN KEY (board_id)
    REFERENCES join_boards(id) ON DELETE CASCADE,
  KEY join_categories_board_idx (board_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A task belongs to a column; the column is the status.
-- category_id may be NULL so deleting a category never deletes tasks.
CREATE TABLE IF NOT EXISTS join_tasks (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  column_id   CHAR(36)     NOT NULL,
  category_id CHAR(36)     NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT         NULL,
  due_date    DATE         NULL,
  priority    VARCHAR(16)  NOT NULL DEFAULT 'medium',
  position    INT          NOT NULL,
  demo_index  INT          NULL DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_task_column FOREIGN KEY (column_id)
    REFERENCES join_columns(id) ON DELETE CASCADE,
  CONSTRAINT join_fk_task_category FOREIGN KEY (category_id)
    REFERENCES join_categories(id) ON DELETE SET NULL,
  KEY join_tasks_column_idx (column_id, position),
  KEY join_tasks_category_idx (category_id),
  KEY join_tasks_due_idx (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS join_subtasks (
  id       CHAR(36)     NOT NULL PRIMARY KEY,
  task_id  CHAR(36)     NOT NULL,
  title    VARCHAR(200) NOT NULL,
  is_done  TINYINT(1)   NOT NULL DEFAULT 0,
  position INT          NOT NULL,
  CONSTRAINT join_fk_subtask_task FOREIGN KEY (task_id)
    REFERENCES join_tasks(id) ON DELETE CASCADE,
  KEY join_subtasks_task_idx (task_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contacts belong to a board, so guest and owner never see each other's.
CREATE TABLE IF NOT EXISTS join_contacts (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  board_id   CHAR(36)     NOT NULL,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(190) NULL,
  phone      VARCHAR(40)  NULL,
  color      CHAR(7)      NOT NULL DEFAULT '#1FD7C1',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT join_fk_contact_board FOREIGN KEY (board_id)
    REFERENCES join_boards(id) ON DELETE CASCADE,
  KEY join_contacts_board_idx (board_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Brake against password guessing: 5 failed tries per IP, then a pause.
CREATE TABLE IF NOT EXISTS join_login_attempts (
  ip            VARCHAR(45) NOT NULL PRIMARY KEY,
  attempts      INT         NOT NULL DEFAULT 0,
  blocked_until DATETIME    NULL,
  updated_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assignment, many to many. Deleting a contact clears its assignments.
CREATE TABLE IF NOT EXISTS join_task_contacts (
  task_id    CHAR(36) NOT NULL,
  contact_id CHAR(36) NOT NULL,
  PRIMARY KEY (task_id, contact_id),
  CONSTRAINT join_fk_tc_task FOREIGN KEY (task_id)
    REFERENCES join_tasks(id) ON DELETE CASCADE,
  CONSTRAINT join_fk_tc_contact FOREIGN KEY (contact_id)
    REFERENCES join_contacts(id) ON DELETE CASCADE,
  KEY join_task_contacts_contact_idx (contact_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
