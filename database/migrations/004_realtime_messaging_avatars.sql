-- Migration 004 — real-time notifications, DB-backed messaging, predefined avatars.
-- Idempotent: safe to run multiple times. Run inside the Neon database referenced
-- by DATABASE_URL.

-- 1) Predefined avatar slot on user_profiles (m1..m3 / f1..f3).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(8);

-- 2) Notifications.
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_desc
  ON notifications(user_id, created_at DESC);

-- 3) Messaging — one canonical row per ordered pair (a < b) + messages.
CREATE TABLE IF NOT EXISTS message_threads (
  id BIGSERIAL PRIMARY KEY,
  user_a_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_thread_pair_order CHECK (user_a_id < user_b_id),
  CONSTRAINT uq_thread_pair UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_user_a
  ON message_threads(user_a_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_user_b
  ON message_threads(user_b_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON messages(thread_id, created_at DESC);
