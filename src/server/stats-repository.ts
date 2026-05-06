import type { Pool } from "pg";

/**
 * Per-user dashboard rollup. Every count comes straight from the DB so the
 * dashboard reflects new signups, profile updates, and connection changes
 * the moment the page is (re)loaded.
 */
export type DashboardStats = {
  totalStudents: number;
  /** Distinct users who share at least one course-code with me. */
  coursemateCount: number;
  mentorCount: number;
  /** People I haven't yet connected/requested with (excludes self). */
  peopleICanMeet: number;
  /** Per-course breakdown for the "Your courses this semester" panel. */
  courses: { code: string; mateCount: number; mateAvatarSeeds: string[] }[];
  /** Recent joiners (excluding the viewer). */
  recentJoiners: {
    id: string;
    name: string;
    handle: string;
    department: string;
    avatarId: string | null;
    joinedAt: string;
  }[];
};

export async function loadDashboardStats(
  pool: Pool,
  viewerId: number,
  myCurrentCourses: string[],
  myDepartment: string,
): Promise<DashboardStats> {
  const courses = myCurrentCourses ?? [];

  // Run every aggregate in parallel — each is a single, indexable query.
  const [
    totalRes,
    coursemateRes,
    mentorRes,
    socialRes,
    perCourseRes,
    sampleAvatarsRes,
    recentRes,
  ] = await Promise.all([
    pool.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM users WHERE id <> $1`,
      [viewerId],
    ),
    courses.length === 0
      ? Promise.resolve({ rows: [{ c: 0 }] } as { rows: { c: number }[] })
      : pool.query<{ c: number }>(
          `SELECT COUNT(DISTINCT user_id)::int AS c
             FROM user_enrollments
            WHERE user_id <> $1
              AND course_code = ANY($2::text[])`,
          [viewerId, courses],
        ),
    pool.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM user_profiles
        WHERE is_mentor = TRUE AND user_id <> $1`,
      [viewerId],
    ),
    pool.query<{ already: number }>(
      `SELECT COUNT(DISTINCT peer)::int AS already FROM (
         SELECT requester_id AS peer FROM connections WHERE peer_id = $1
         UNION ALL
         SELECT peer_id      AS peer FROM connections WHERE requester_id = $1
       ) t`,
      [viewerId],
    ),
    courses.length === 0
      ? Promise.resolve({
          rows: [] as { course_code: string; c: number }[],
        })
      : pool.query<{ course_code: string; c: number }>(
          `SELECT course_code, COUNT(DISTINCT user_id)::int AS c
             FROM user_enrollments
            WHERE user_id <> $1
              AND course_code = ANY($2::text[])
            GROUP BY course_code`,
          [viewerId, courses],
        ),
    courses.length === 0
      ? Promise.resolve({
          rows: [] as {
            course_code: string;
            handle: string;
          }[],
        })
      : pool.query<{ course_code: string; handle: string }>(
          // Up to 4 sample handles per course, deterministic by id ASC.
          // Used to render the avatar stack on the course panel.
          `SELECT t.course_code, t.handle
             FROM (
               SELECT e.course_code, u.handle,
                      ROW_NUMBER() OVER (PARTITION BY e.course_code ORDER BY u.id ASC) AS rn
                 FROM user_enrollments e
                 JOIN users u ON u.id = e.user_id
                WHERE e.user_id <> $1
                  AND e.course_code = ANY($2::text[])
             ) t
            WHERE t.rn <= 4`,
          [viewerId, courses],
        ),
    pool.query<{
      id: number;
      handle: string;
      display_name: string;
      department: string;
      avatar_id: string | null;
      joined_at: Date | string;
    }>(
      `SELECT u.id, u.handle, p.display_name, p.department, p.avatar_id, p.joined_at
         FROM user_profiles p JOIN users u ON u.id = p.user_id
        WHERE u.id <> $1
        ORDER BY p.joined_at DESC
        LIMIT 5`,
      [viewerId],
    ),
  ]);

  const total = Number(totalRes.rows[0]?.c ?? 0);
  const already = Number(socialRes.rows[0]?.already ?? 0);
  const peopleICanMeet = Math.max(0, total - already);

  const sampleByCourse = new Map<string, string[]>();
  for (const row of sampleAvatarsRes.rows) {
    const list = sampleByCourse.get(row.course_code) ?? [];
    list.push(row.handle);
    sampleByCourse.set(row.course_code, list);
  }

  const courseCountByCode = new Map(
    perCourseRes.rows.map((r) => [r.course_code, Number(r.c)]),
  );

  // Preserve the user's course order so the panel matches their profile.
  const orderedCourses = courses.map((code) => ({
    code,
    mateCount: courseCountByCode.get(code) ?? 0,
    mateAvatarSeeds: sampleByCourse.get(code) ?? [],
  }));

  // Soft hint: keep first compile happy on the unused `myDepartment` arg —
  // the field is reserved for future faculty-aware ranking.
  void myDepartment;

  return {
    totalStudents: total,
    coursemateCount: Number(coursemateRes.rows[0]?.c ?? 0),
    mentorCount: Number(mentorRes.rows[0]?.c ?? 0),
    peopleICanMeet,
    courses: orderedCourses,
    recentJoiners: recentRes.rows.map((r) => ({
      id: String(r.id),
      name: r.display_name ?? "",
      handle: r.handle,
      department: r.department,
      avatarId: r.avatar_id,
      joinedAt:
        typeof r.joined_at === "string"
          ? r.joined_at
          : new Date(r.joined_at).toISOString(),
    })),
  };
}

/**
 * Server-side ranking for "Daily picks" — same weights as the client-side
 * `matchScore`, but executed in SQL so we never load every user into JS.
 *
 * Scoring weights:
 *   shared courses × 12, shared skills × 6, shared interests × 4,
 *   same department + 6, same semester + 3.
 */
export async function rankDailyPicks(
  pool: Pool,
  viewer: {
    id: number;
    department: string;
    semester: number;
    skills: string[];
    interests: string[];
    courses: string[];
  },
  limit: number = 6,
): Promise<number[]> {
  const r = await pool.query<{ id: number; score: number }>(
    `
    WITH
      my_courses AS (
        SELECT UNNEST($2::text[]) AS code
      ),
      my_skills AS (
        SELECT UNNEST($3::text[]) AS skill
      ),
      my_interests AS (
        SELECT UNNEST($4::text[]) AS interest
      ),
      candidate AS (
        SELECT u.id, p.department, p.semester
          FROM users u
          JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id <> $1
      ),
      course_overlap AS (
        SELECT e.user_id, COUNT(*)::int AS c
          FROM user_enrollments e
          JOIN my_courses mc ON mc.code = e.course_code
         WHERE e.user_id <> $1
         GROUP BY e.user_id
      ),
      skill_overlap AS (
        SELECT s.user_id, COUNT(*)::int AS c
          FROM user_skills s
          JOIN my_skills ms ON ms.skill = s.skill
         WHERE s.user_id <> $1
         GROUP BY s.user_id
      ),
      interest_overlap AS (
        SELECT i.user_id, COUNT(*)::int AS c
          FROM user_interests i
          JOIN my_interests mi ON mi.interest = i.interest
         WHERE i.user_id <> $1
         GROUP BY i.user_id
      )
    SELECT cd.id,
           (
             COALESCE(co.c, 0) * 12 +
             COALESCE(so.c, 0) * 6  +
             COALESCE(io.c, 0) * 4  +
             (CASE WHEN cd.department = $5 THEN 6 ELSE 0 END) +
             (CASE WHEN cd.semester   = $6 THEN 3 ELSE 0 END)
           ) AS score
      FROM candidate cd
      LEFT JOIN course_overlap   co ON co.user_id = cd.id
      LEFT JOIN skill_overlap    so ON so.user_id = cd.id
      LEFT JOIN interest_overlap io ON io.user_id = cd.id
     WHERE (
       COALESCE(co.c, 0) > 0 OR COALESCE(so.c, 0) > 0 OR
       COALESCE(io.c, 0) > 0 OR cd.department = $5 OR cd.semester = $6
     )
     ORDER BY score DESC, cd.id ASC
     LIMIT $7
    `,
    [
      viewer.id,
      viewer.courses,
      viewer.skills,
      viewer.interests,
      viewer.department,
      viewer.semester,
      Math.min(Math.max(limit, 1), 30),
    ],
  );
  return r.rows.map((row) => Number(row.id)).filter(Number.isFinite);
}

/**
 * Lightweight "popular courses among everyone else" — for the Coursemates
 * suggestions panel. Excludes the viewer's own current courses.
 */
export async function popularCoursesExcluding(
  pool: Pool,
  viewerId: number,
  excludeCodes: string[],
  limit: number = 4,
): Promise<{ code: string; count: number }[]> {
  const r = await pool.query<{ course_code: string; c: number }>(
    `SELECT course_code, COUNT(DISTINCT user_id)::int AS c
       FROM user_enrollments
      WHERE user_id <> $1
        AND ($2::text[] IS NULL OR NOT (course_code = ANY($2::text[])))
      GROUP BY course_code
      ORDER BY c DESC, course_code ASC
      LIMIT $3`,
    [viewerId, excludeCodes.length ? excludeCodes : null, limit],
  );
  return r.rows.map((row) => ({
    code: row.course_code,
    count: Number(row.c),
  }));
}
