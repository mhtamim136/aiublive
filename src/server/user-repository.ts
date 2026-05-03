import type { Pool, PoolClient } from "pg";
import { deriveLevel } from "@/lib/catalog";
import type {
  Achievement,
  CourseEnrollment,
  Department,
  Faculty,
  Project,
  Student,
} from "@/lib/types";
import { maskStudentId } from "./student-mask";
import type { SignupValidated } from "./validation";

const LOGIN_LIMIT = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

type UserRow = {
  id: number;
  student_id: string;
  handle: string;
  password_hash: string;
  locked_until: Date | string | null;
  failed_attempt_count: number;
  last_failed_attempt_at: Date | string | null;
};

function asDate(v: Date | string | null): Date | null {
  if (!v) return null;
  return typeof v === "string" ? new Date(v) : v;
}

export async function fetchUserCredentials(
  pool: Pool,
  studentIdNorm: string,
): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT id, student_id, handle, password_hash, locked_until,
            failed_attempt_count, last_failed_attempt_at
       FROM users WHERE student_id = $1 LIMIT 1`,
    [studentIdNorm],
  );
  return r.rows[0] ?? null;
}

export async function fetchUserStudentId(pool: Pool, userId: number) {
  const r = await pool.query<{ student_id: string }>(
    "SELECT student_id FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );
  return r.rows[0]?.student_id ?? "";
}

export async function resetLoginFailures(pool: Pool, userId: number) {
  await pool.query(
    `UPDATE users SET failed_attempt_count = 0,
        last_failed_attempt_at = NULL, locked_until = NULL WHERE id = $1`,
    [userId],
  );
}

/**
 * Applies one failed-login attempt on the locked DB row so counts stay correct.
 */
export async function applyFailedLogin(
  pool: Pool,
  userId: number,
): Promise<{ lockedUntilMs: number | null; remainingBeforeLock: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query<{
      failed_attempt_count: number;
      last_failed_attempt_at: Date | null;
    }>(
      `SELECT failed_attempt_count, last_failed_attempt_at
         FROM users WHERE id = $1
         FOR UPDATE`,
      [userId],
    );
    const lockedUser = r.rows[0];
    if (!lockedUser) {
      await client.query("ROLLBACK");
      return { lockedUntilMs: null, remainingBeforeLock: LOGIN_LIMIT };
    }

    const now = Date.now();
    const last = asDate(lockedUser.last_failed_attempt_at);
    let count =
      last && now - last.getTime() < WINDOW_MS
        ? lockedUser.failed_attempt_count + 1
        : 1;

    let lockedUntil: Date | null = null;
    if (count >= LOGIN_LIMIT) {
      lockedUntil = new Date(now + LOCKOUT_MS);
      count = 0;
    }

    await client.query(
      `UPDATE users SET failed_attempt_count = $1, last_failed_attempt_at = NOW(),
          locked_until = $2 WHERE id = $3`,
      [count, lockedUntil, userId],
    );
    await client.query("COMMIT");

    const lockedMs = lockedUntil ? lockedUntil.getTime() : null;
    const cur = lockedMs ? 0 : Math.min(count, LOGIN_LIMIT);

    return {
      lockedUntilMs: lockedMs,
      remainingBeforeLock: Math.max(0, LOGIN_LIMIT - cur),
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ── Helpers used during signup + profile patch ──────────────────────────

async function replaceSkills(
  client: PoolClient,
  userId: number,
  skills: string[],
) {
  await client.query("DELETE FROM user_skills WHERE user_id = $1", [userId]);
  const seen = new Set<string>();
  for (const s of skills) {
    const trimmed = s.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    await client.query(
      "INSERT INTO user_skills (user_id, skill) VALUES ($1, $2)",
      [userId, trimmed],
    );
  }
}

async function replaceInterests(
  client: PoolClient,
  userId: number,
  items: string[],
) {
  await client.query("DELETE FROM user_interests WHERE user_id = $1", [userId]);
  const seen = new Set<string>();
  for (const s of items) {
    const trimmed = s.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    await client.query(
      "INSERT INTO user_interests (user_id, interest) VALUES ($1, $2)",
      [userId, trimmed],
    );
  }
}

async function replaceOpenness(
  client: PoolClient,
  userId: number,
  labels: string[],
) {
  await client.query("DELETE FROM user_openness WHERE user_id = $1", [userId]);
  const seen = new Set<string>();
  for (const s of labels) {
    if (!s || seen.has(s)) continue;
    seen.add(s);
    await client.query(
      "INSERT INTO user_openness (user_id, label) VALUES ($1, $2)",
      [userId, s],
    );
  }
}

async function replaceEnrollments(
  client: PoolClient,
  userId: number,
  items: CourseEnrollment[],
) {
  await client.query("DELETE FROM user_enrollments WHERE user_id = $1", [
    userId,
  ]);
  const seen = new Set<string>();
  for (const e of items) {
    if (!e?.courseCode || seen.has(e.courseCode)) continue;
    seen.add(e.courseCode);
    await client.query(
      `INSERT INTO user_enrollments (user_id, course_code, section)
       VALUES ($1, $2, $3)`,
      [userId, e.courseCode, e.section],
    );
  }
}

async function replacePortfolio(
  client: PoolClient,
  userId: number,
  items: (Pick<
    Project,
    "id" | "title" | "description" | "tags" | "year"
  > & { link?: string })[],
) {
  await client.query(
    "DELETE FROM user_portfolio_projects WHERE user_id = $1",
    [userId],
  );
  const seen = new Set<string>();
  for (const p of items) {
    if (!p?.id || seen.has(p.id)) continue;
    seen.add(p.id);
    await client.query(
      `INSERT INTO user_portfolio_projects (user_id, pid, title, description, year, tags_json, link)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        userId,
        p.id,
        p.title,
        p.description ?? "",
        p.year,
        JSON.stringify(p.tags ?? []),
        p.link ?? null,
      ],
    );
  }
}

async function replaceAchievements(
  client: PoolClient,
  userId: number,
  items: (Pick<Achievement, "id" | "title" | "year"> & {
    description?: string;
    type?: Achievement["type"];
  })[],
) {
  await client.query("DELETE FROM user_achievements WHERE user_id = $1", [
    userId,
  ]);
  const seen = new Set<string>();
  for (const a of items) {
    if (!a?.id || seen.has(a.id)) continue;
    seen.add(a.id);
    await client.query(
      `INSERT INTO user_achievements (user_id, aid, title, description, year, type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        a.id,
        a.title,
        a.description ?? null,
        a.year,
        a.type ?? "academic",
      ],
    );
  }
}

export async function signupUser(
  pool: Pool,
  input: SignupValidated,
  passwordHash: string,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: number }>(
      "INSERT INTO users (student_id, handle, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [input.studentId, input.profile.handle, passwordHash],
    );
    const uid = Number(inserted.rows[0]?.id);
    if (!uid) throw new Error("Signup insert failed");

    const p = input.profile;
    await client.query(
      `INSERT INTO user_profiles (
        user_id, display_name, department, faculty, semester, bio, vibe,
        is_mentor, joined_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        uid,
        p.name,
        p.department,
        p.faculty,
        p.semester,
        p.bio ?? "",
        p.vibe ?? "",
        !!p.isMentor,
      ],
    );

    await replaceSkills(client, uid, p.skills);
    await replaceInterests(client, uid, p.interests);
    await replaceOpenness(client, uid, p.openTo);
    await replaceEnrollments(client, uid, p.courseEnrollments);
    await replacePortfolio(client, uid, p.projects ?? []);
    await replaceAchievements(client, uid, p.achievements ?? []);

    await client.query("COMMIT");
    return uid;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

type ProfileRow = {
  display_name: string;
  department: string;
  faculty: string;
  semester: number;
  bio: string;
  vibe: string;
  is_mentor: boolean;
  avatar_storage_path: string | null;
  github: string | null;
  linkedin: string | null;
  website: string | null;
  joined_at: Date | string;
};

export async function loadStudent(
  pool: Pool,
  userId: number,
): Promise<Student | null> {
  const [uRes, pRes] = await Promise.all([
    pool.query<{ id: number; student_id: string; handle: string }>(
      "SELECT id, student_id, handle FROM users WHERE id = $1 LIMIT 1",
      [userId],
    ),
    pool.query<ProfileRow>(
      `SELECT display_name, department, faculty, semester, bio, vibe,
              is_mentor, avatar_storage_path, github, linkedin, website, joined_at
         FROM user_profiles WHERE user_id = $1 LIMIT 1`,
      [userId],
    ),
  ]);

  const user = uRes.rows[0];
  const profileRow = pRes.rows[0];
  if (!user || !profileRow) return null;

  const [skRes, inRes, opRes, enRes, pjRes, achRes] = await Promise.all([
    pool.query<{ skill: string }>(
      "SELECT skill FROM user_skills WHERE user_id = $1 ORDER BY skill ASC",
      [userId],
    ),
    pool.query<{ interest: string }>(
      "SELECT interest FROM user_interests WHERE user_id = $1 ORDER BY interest ASC",
      [userId],
    ),
    pool.query<{ label: string }>(
      "SELECT label FROM user_openness WHERE user_id = $1 ORDER BY label ASC",
      [userId],
    ),
    pool.query<{ course_code: string; section: string }>(
      `SELECT course_code, section FROM user_enrollments
         WHERE user_id = $1 ORDER BY course_code ASC`,
      [userId],
    ),
    pool.query<{
      pid: string;
      title: string;
      description: string;
      year: number;
      tags_json: unknown;
      link: string | null;
    }>(
      `SELECT pid, title, description, year, tags_json, link
         FROM user_portfolio_projects WHERE user_id = $1 ORDER BY id DESC`,
      [userId],
    ),
    pool.query<{
      aid: string;
      title: string;
      description: string | null;
      year: number;
      type: Achievement["type"];
    }>(
      `SELECT aid, title, description, year, type
         FROM user_achievements WHERE user_id = $1 ORDER BY id DESC`,
      [userId],
    ),
  ]);

  const skills = skRes.rows.map((r) => r.skill);
  const interests = inRes.rows.map((r) => r.interest);
  const openTo = opRes.rows.map((r) => r.label) as Student["openTo"];
  const enrollments: CourseEnrollment[] = enRes.rows.map((r) => ({
    courseCode: r.course_code,
    section: r.section,
  }));
  const currentCourses = enrollments.map((e) => e.courseCode);

  const projects: Project[] = pjRes.rows.map((r) => ({
    id: String(r.pid),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    tags: Array.isArray(r.tags_json) ? (r.tags_json as string[]) : [],
    year: Number(r.year),
    link:
      typeof r.link === "string" && r.link.trim() ? r.link : undefined,
  }));

  const achievements: Achievement[] = achRes.rows.map((r) => ({
    id: String(r.aid),
    title: String(r.title ?? ""),
    description: r.description ?? undefined,
    year: Number(r.year),
    type: (r.type as Achievement["type"]) ?? "academic",
  }));

  let profileImageUrl: string | undefined;
  const ap = String(profileRow.avatar_storage_path ?? "").trim();
  if (ap) {
    profileImageUrl = `/${ap.replace(/^\/+/, "")}`;
  }

  const sem = Number(profileRow.semester);
  const gh = profileRow.github;
  const li = profileRow.linkedin;
  const ws = profileRow.website;

  return {
    id: String(user.id),
    userNumber: Number(user.id),
    name: String(profileRow.display_name ?? ""),
    handle: user.handle,
    studentIdMasked: maskStudentId(user.student_id),
    department: profileRow.department as Department,
    faculty: profileRow.faculty as Faculty,
    semester: sem,
    level: deriveLevel(sem),
    bio: String(profileRow.bio ?? ""),
    vibe: String(profileRow.vibe ?? ""),
    skills,
    interests,
    currentCourses,
    courseEnrollments: enrollments,
    projects,
    achievements,
    openTo,
    isMentor: !!profileRow.is_mentor,
    links:
      gh || li || ws
        ? {
            ...(gh?.trim() ? { github: gh } : {}),
            ...(li?.trim() ? { linkedin: li } : {}),
            ...(ws?.trim() ? { website: ws } : {}),
          }
        : undefined,
    joinedAt:
      typeof profileRow.joined_at === "string"
        ? profileRow.joined_at
        : new Date(profileRow.joined_at).toISOString(),
    profileImageUrl,
  };
}

export async function isHandleTaken(
  pool: Pool,
  handle: string,
  exceptUserId?: number,
): Promise<boolean> {
  if (exceptUserId != null) {
    const r = await pool.query(
      "SELECT 1 FROM users WHERE handle = $1 AND id <> $2 LIMIT 1",
      [handle, exceptUserId],
    );
    return (r.rowCount ?? 0) > 0;
  }
  const r = await pool.query("SELECT 1 FROM users WHERE handle = $1 LIMIT 1", [
    handle,
  ]);
  return (r.rowCount ?? 0) > 0;
}

export async function updatePasswordHash(
  pool: Pool,
  userId: number,
  passwordHash: string,
) {
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    passwordHash,
    userId,
  ]);
}

export async function setAvatarPath(
  pool: Pool,
  userId: number,
  relativePath: string | null,
) {
  await pool.query(
    "UPDATE user_profiles SET avatar_storage_path = $1 WHERE user_id = $2",
    [relativePath, userId],
  );
}

export type ProfilePatchFlat = Partial<{
  display_name: string;
  handle: string;
  department: Department;
  faculty: Faculty;
  semester: number;
  bio: string;
  vibe: string;
  isMentor: boolean;
  github: string | null;
  linkedin: string | null;
  website: string | null;
  skills: string[];
  interests: string[];
  openTo: Student["openTo"];
  enrollments: CourseEnrollment[];
  projects: (Pick<
    Project,
    "id" | "title" | "description" | "tags" | "year"
  > & { link?: string })[];
  achievements: (Pick<Achievement, "id" | "title" | "year"> & {
    description?: string;
    type?: Achievement["type"];
  })[];
}>;

export async function patchProfileDb(
  pool: Pool,
  userId: number,
  patch: ProfilePatchFlat,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (patch.handle != null) {
      await client.query("UPDATE users SET handle = $1 WHERE id = $2", [
        patch.handle,
        userId,
      ]);
    }

    const assigns: string[] = [];
    const vals: unknown[] = [];

    const add = (col: string, value: unknown) => {
      vals.push(value);
      assigns.push(`${col} = $${vals.length}`);
    };

    if (patch.display_name != null) add("display_name", patch.display_name);
    if (patch.department != null) add("department", patch.department);
    if (patch.faculty != null) add("faculty", patch.faculty);
    if (patch.semester != null) add("semester", patch.semester);
    if (patch.bio != null) add("bio", patch.bio);
    if (patch.vibe != null) add("vibe", patch.vibe);
    if (patch.isMentor != null) add("is_mentor", !!patch.isMentor);
    if (patch.github !== undefined) add("github", patch.github);
    if (patch.linkedin !== undefined) add("linkedin", patch.linkedin);
    if (patch.website !== undefined) add("website", patch.website);

    if (assigns.length > 0) {
      vals.push(userId);
      await client.query(
        `UPDATE user_profiles SET ${assigns.join(", ")} WHERE user_id = $${vals.length}`,
        vals,
      );
    }

    if (patch.skills) await replaceSkills(client, userId, patch.skills);
    if (patch.interests) await replaceInterests(client, userId, patch.interests);
    if (patch.openTo)
      await replaceOpenness(client, userId, patch.openTo as string[]);
    if (patch.enrollments)
      await replaceEnrollments(client, userId, patch.enrollments);
    if (patch.projects) await replacePortfolio(client, userId, patch.projects);
    if (patch.achievements)
      await replaceAchievements(client, userId, patch.achievements);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function searchPublicStudents(
  pool: Pool,
  opts: {
    q?: string;
    department?: Department;
    excludeIds?: number[];
    limit?: number;
  },
): Promise<number[]> {
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 120);
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];
  const ph = (val: unknown) => {
    params.push(val);
    return `$${params.length}`;
  };

  if (opts.excludeIds?.length) {
    const phs = opts.excludeIds.map((id) => ph(id));
    clauses.push(`u.id NOT IN (${phs.join(",")})`);
  }

  if (opts.department) {
    clauses.push(`p.department = ${ph(opts.department)}`);
  }

  const raw = opts.q?.trim().slice(0, 96);
  if (raw) {
    const term = raw.replace(/[%_]/g, "").trim();
    const pat = term.length > 0 ? `%${term}%` : `%${raw}%`;
    const isNumeric = /^[0-9]+$/.test(term);
    const compactStudent = term.toUpperCase().replace(/[^\d]/g, "");

    const subClauses: string[] = [
      `u.handle ILIKE ${ph(pat)}`,
      `p.display_name ILIKE ${ph(pat)}`,
      `u.student_id ILIKE ${ph(pat.toUpperCase())}`,
      `REPLACE(REPLACE(u.student_id,'-',''),' ','') ILIKE ${ph(`%${compactStudent}%`)}`,
    ];

    if (isNumeric) {
      const idNum = Number(term);
      subClauses.push(`u.id::text ILIKE ${ph(`${term}%`)}`);
      if (Number.isFinite(idNum)) {
        subClauses.push(`u.id = ${ph(idNum)}`);
      }
    }

    clauses.push(`(${subClauses.join(" OR ")})`);
  }

  const sql = `
    SELECT u.id FROM users u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE ${clauses.join(" AND ")}
    ORDER BY p.joined_at DESC
    LIMIT ${limit}`;
  const r = await pool.query<{ id: number }>(sql, params);
  return r.rows.map((row) => Number(row.id)).filter(Number.isFinite);
}

export async function findUsersInCourseSection(
  pool: Pool,
  opts: {
    courseCode: string;
    section?: string | null;
    excludeUserId?: number;
    limit?: number;
  },
): Promise<number[]> {
  const lim = Math.min(Math.max(opts.limit ?? 120, 1), 240);
  const params: unknown[] = [];
  const ph = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  const wherePieces: string[] = [`e.course_code = ${ph(opts.courseCode)}`];
  if (opts.section?.trim()) {
    wherePieces.push(`e.section = ${ph(opts.section.trim())}`);
  }
  wherePieces.push(`e.user_id <> ${ph(opts.excludeUserId ?? 0)}`);

  const sql = `
    SELECT DISTINCT e.user_id AS id FROM user_enrollments e
    WHERE ${wherePieces.join(" AND ")}
    ORDER BY id ASC LIMIT ${lim}`;

  const r = await pool.query<{ id: number }>(sql, params);
  return r.rows.map((row) => Number(row.id)).filter(Number.isFinite);
}

export async function deleteUser(pool: Pool, userId: number) {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
}
