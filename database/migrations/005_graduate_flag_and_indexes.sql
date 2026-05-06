-- Migration 005 — explicit graduation flag + perf indexes for hot paths.
-- Idempotent: safe to run multiple times.

-- 1) Explicit graduation status. Semester alone no longer decides "Graduate" —
--    students stay "Senior" through 7..12, and graduation is set explicitly.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_graduate BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Coursemates lookup: filtered by (course_code [, section]).
--    `(user_id, course_code)` already exists (PK), but reverse-direction lookup
--    by course_code is unindexed — fix that.
CREATE INDEX IF NOT EXISTS idx_user_enrollments_course
  ON user_enrollments(course_code, section);

-- 3) Skill / interest lookups by token (used for matching + search).
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests(interest);

-- 4) Discover / dashboard ranking primarily orders by joined_at DESC.
CREATE INDEX IF NOT EXISTS idx_user_profiles_joined_at
  ON user_profiles(joined_at DESC);

-- 5) Filter by department (Discover, dashboard stats).
CREATE INDEX IF NOT EXISTS idx_user_profiles_department
  ON user_profiles(department);

-- 6) Mentors-only discovery queries.
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_mentor
  ON user_profiles(is_mentor) WHERE is_mentor = TRUE;

-- 7) Connection lookups for "my pending / connected" sets are by either
--    requester_id or peer_id — index both.
CREATE INDEX IF NOT EXISTS idx_connections_requester
  ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_peer
  ON connections(peer_id);

-- 8) Bookmarks (already PK on (user_id, target_user_id)). Add reverse for
--    "who saved me" if we need it later — cheap.
CREATE INDEX IF NOT EXISTS idx_bookmarks_target ON bookmarks(target_user_id);
