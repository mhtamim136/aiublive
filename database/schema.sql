-- AIUB Live — MySQL schema (XAMPP / phpMyAdmin)
-- Paste in phpMyAdmin → SQL tab, then Run.

CREATE DATABASE IF NOT EXISTS aiub_live
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aiub_live;

-- ── Accounts (credentials + login lock state) ───────────────────────────
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(14) NOT NULL COMMENT 'Normalized e.g. 22-12345-1',
  handle VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt',
  locked_until TIMESTAMP NULL DEFAULT NULL,
  failed_attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_failed_attempt_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_student_id (student_id),
  UNIQUE KEY uq_users_handle (handle)
) ENGINE=InnoDB;

-- ── Editable profile (one row per user) ──────────────────────────────────
CREATE TABLE user_profiles (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  department VARCHAR(32) NOT NULL,
  faculty VARCHAR(16) NOT NULL,
  semester TINYINT UNSIGNED NOT NULL,
  bio VARCHAR(560) NOT NULL DEFAULT '',
  vibe VARCHAR(160) NOT NULL DEFAULT '',
  is_mentor TINYINT(1) NOT NULL DEFAULT 0,
  avatar_storage_path VARCHAR(512) DEFAULT NULL COMMENT 'Relative to web root',
  github VARCHAR(512) DEFAULT NULL,
  linkedin VARCHAR(512) DEFAULT NULL,
  website VARCHAR(512) DEFAULT NULL,
  joined_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_skills (
  user_id BIGINT UNSIGNED NOT NULL,
  skill VARCHAR(80) NOT NULL,
  PRIMARY KEY (user_id, skill(64)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_interests (
  user_id BIGINT UNSIGNED NOT NULL,
  interest VARCHAR(80) NOT NULL,
  PRIMARY KEY (user_id, interest(64)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_openness (
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(32) NOT NULL,
  PRIMARY KEY (user_id, label),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_enrollments (
  user_id BIGINT UNSIGNED NOT NULL,
  course_code VARCHAR(24) NOT NULL,
  section VARCHAR(16) NOT NULL,
  PRIMARY KEY (user_id, course_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_portfolio_projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  pid VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(1200) NOT NULL DEFAULT '',
  year SMALLINT UNSIGNED NOT NULL,
  tags_json JSON NULL,
  link VARCHAR(768) DEFAULT NULL,
  UNIQUE KEY uq_portfolio_uid_pid (user_id, pid),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_achievements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  aid VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(560) DEFAULT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  type ENUM('academic','competition','project','leadership') NOT NULL DEFAULT 'academic',
  UNIQUE KEY uq_ach_uid_aid (user_id, aid),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE connections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  requester_id BIGINT UNSIGNED NOT NULL,
  peer_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','connected','rejected','blocked') NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_connections_pair (requester_id, peer_id),
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (peer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bookmarks (
  user_id BIGINT UNSIGNED NOT NULL,
  target_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, target_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Team-finder posts (persisted boards)
CREATE TABLE team_project_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  post_id VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(2400) NOT NULL DEFAULT '',
  skills_wanted_json JSON NULL,
  roles_needed_json JSON NULL,
  team_size SMALLINT UNSIGNED NOT NULL DEFAULT 4,
  tags_json JSON NULL,
  status ENUM('open','in-progress','closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_team_post_uid (owner_user_id, post_id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE team_project_members (
  post_db_id BIGINT UNSIGNED NOT NULL,
  member_user_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (post_db_id, member_user_id),
  FOREIGN KEY (post_db_id) REFERENCES team_project_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (member_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

