-- AIUB Live — PostgreSQL schema (Neon / vanilla Postgres)
-- Run inside the database referenced by DATABASE_URL.
-- Safe to re-run: every CREATE uses IF NOT EXISTS / DO blocks for ENUMs.

-- ── Helper trigger so timestamps emulate MySQL's
--    `ON UPDATE CURRENT_TIMESTAMP` semantics. ───────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Accounts (credentials + login lock state) ───────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  student_id VARCHAR(14) NOT NULL,
  handle VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  locked_until TIMESTAMPTZ,
  failed_attempt_count INTEGER NOT NULL DEFAULT 0,
  last_failed_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_student_id UNIQUE (student_id),
  CONSTRAINT uq_users_handle UNIQUE (handle)
);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ── Editable profile (one row per user) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(120) NOT NULL,
  department VARCHAR(32) NOT NULL,
  faculty VARCHAR(16) NOT NULL,
  semester SMALLINT NOT NULL,
  bio VARCHAR(560) NOT NULL DEFAULT '',
  vibe VARCHAR(160) NOT NULL DEFAULT '',
  is_mentor BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_storage_path VARCHAR(512), -- legacy upload path (kept for back-compat)
  avatar_id VARCHAR(8),             -- one of m1..m3 / f1..f3 (predefined)
  github VARCHAR(512),
  linkedin VARCHAR(512),
  website VARCHAR(512),
  joined_at TIMESTAMPTZ NOT NULL
);

-- Safety net for databases created before avatar_id existed.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(8);

CREATE TABLE IF NOT EXISTS user_skills (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill VARCHAR(80) NOT NULL,
  PRIMARY KEY (user_id, skill)
);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest VARCHAR(80) NOT NULL,
  PRIMARY KEY (user_id, interest)
);

CREATE TABLE IF NOT EXISTS user_openness (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(32) NOT NULL,
  PRIMARY KEY (user_id, label)
);

CREATE TABLE IF NOT EXISTS user_enrollments (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_code VARCHAR(24) NOT NULL,
  section VARCHAR(16) NOT NULL,
  PRIMARY KEY (user_id, course_code)
);

CREATE TABLE IF NOT EXISTS user_portfolio_projects (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pid VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(1200) NOT NULL DEFAULT '',
  year SMALLINT NOT NULL,
  tags_json JSONB,
  link VARCHAR(768),
  CONSTRAINT uq_portfolio_uid_pid UNIQUE (user_id, pid)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_type') THEN
    CREATE TYPE achievement_type AS ENUM ('academic','competition','project','leadership');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  aid VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(560),
  year SMALLINT NOT NULL,
  type achievement_type NOT NULL DEFAULT 'academic',
  CONSTRAINT uq_ach_uid_aid UNIQUE (user_id, aid)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_status') THEN
    CREATE TYPE connection_status AS ENUM ('pending','connected','rejected','blocked');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS connections (
  id BIGSERIAL PRIMARY KEY,
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  peer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_connections_pair UNIQUE (requester_id, peer_id)
);

DROP TRIGGER IF EXISTS connections_set_updated_at ON connections;
CREATE TRIGGER connections_set_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target_user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_post_status') THEN
    CREATE TYPE team_post_status AS ENUM ('open','in-progress','closed');
  END IF;
END
$$;

-- Optional: persistent team-finder posts (kept for parity with the previous
-- schema; the live UI still uses the in-memory store).
CREATE TABLE IF NOT EXISTS team_project_posts (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(2400) NOT NULL DEFAULT '',
  skills_wanted_json JSONB,
  roles_needed_json JSONB,
  team_size SMALLINT NOT NULL DEFAULT 4,
  tags_json JSONB,
  status team_post_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_post_uid UNIQUE (owner_user_id, post_id)
);

CREATE TABLE IF NOT EXISTS team_project_members (
  post_db_id BIGINT NOT NULL REFERENCES team_project_posts(id) ON DELETE CASCADE,
  member_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_db_id, member_user_id)
);

-- ── Realtime notifications (persisted; SSE pushes the live event) ────────
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'connection-request' | 'connection-accepted' | 'message' | 'team-activity'
  kind VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Most-common access pattern is "list my recent notifications".
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_desc
  ON notifications(user_id, created_at DESC);

-- ── Direct-message threads + messages ────────────────────────────────────
-- One row per ordered pair (user_a_id < user_b_id). The CHECK enforces the
-- canonical ordering so we can use a simple unique constraint instead of
-- juggling two-way lookups in the application layer.
CREATE TABLE IF NOT EXISTS message_threads (
  id BIGSERIAL PRIMARY KEY,
  user_a_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_thread_pair_order CHECK (user_a_id < user_b_id),
  CONSTRAINT uq_thread_pair UNIQUE (user_a_id, user_b_id)
);

-- Find threads either side participates in:
CREATE INDEX IF NOT EXISTS idx_threads_user_a ON message_threads(user_a_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_user_b ON message_threads(user_b_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON messages(thread_id, created_at DESC);
