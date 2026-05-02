import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
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
  const [rows] = await pool.execute<UserRow[] & RowDataPacket[]>(
    `SELECT id, student_id, handle, password_hash, locked_until,
            failed_attempt_count, last_failed_attempt_at
       FROM users WHERE student_id = ? LIMIT 1`,
    [studentIdNorm],
  );
  return rows.length ? rows[0] : null;
}

export async function fetchUserStudentId(pool: Pool, userId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT student_id FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  const r = rows[0];
  return r?.student_id ? String(r.student_id) : "";
}

export async function resetLoginFailures(pool: Pool, userId: number) {
  await pool.execute<ResultSetHeader>(
    `UPDATE users SET failed_attempt_count = 0,
        last_failed_attempt_at = NULL, locked_until = NULL WHERE id = ?`,
    [userId],
  );
}

/**
 * Applies one failed-login attempt on the locked DB row so counts stay correct.
 */
export async function applyFailedLogin(pool: Pool, userId: number): Promise<{
  lockedUntilMs: number | null;
  remainingBeforeLock: number;
}> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<UserRow[] & RowDataPacket[]>(
      `SELECT failed_attempt_count, last_failed_attempt_at
         FROM users WHERE id = ?
         FOR UPDATE`,
      [userId],
    );
    const lockedUser = rows[0];
    if (!lockedUser) {
      await conn.rollback();
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

    await conn.execute(
      `UPDATE users SET failed_attempt_count = ?, last_failed_attempt_at = NOW(),
          locked_until = ? WHERE id = ?`,
      [count, lockedUntil, userId],
    );
    await conn.commit();

    const lockedMs = lockedUntil ? lockedUntil.getTime() : null;
    const cur = lockedMs ? 0 : Math.min(count, LOGIN_LIMIT);

    return {
      lockedUntilMs: lockedMs,
      remainingBeforeLock: Math.max(0, LOGIN_LIMIT - cur),
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function replaceSkills(
  conn: PoolConnection,
  userId: number,
  skills: string[],
) {
  await conn.execute("DELETE FROM user_skills WHERE user_id = ?", [userId]);
  for (const s of skills) {
    await conn.execute(
      "INSERT INTO user_skills (user_id, skill) VALUES (?, ?)",
      [userId, s.trim()],
    );
  }
}

async function replaceInterests(
  conn: PoolConnection,
  userId: number,
  items: string[],
) {
  await conn.execute("DELETE FROM user_interests WHERE user_id = ?", [userId]);
  for (const s of items) {
    await conn.execute(
      "INSERT INTO user_interests (user_id, interest) VALUES (?, ?)",
      [userId, s.trim()],
    );
  }
}

async function replaceOpenness(
  conn: PoolConnection,
  userId: number,
  labels: string[],
) {
  await conn.execute("DELETE FROM user_openness WHERE user_id = ?", [userId]);
  for (const s of labels) {
    await conn.execute(
      "INSERT INTO user_openness (user_id, label) VALUES (?, ?)",
      [userId, s],
    );
  }
}

async function replaceEnrollments(
  conn: PoolConnection,
  userId: number,
  items: CourseEnrollment[],
) {
  await conn.execute("DELETE FROM user_enrollments WHERE user_id = ?", [
    userId,
  ]);
  for (const e of items) {
    await conn.execute(
      `INSERT INTO user_enrollments (user_id, course_code, section)
       VALUES (?, ?, ?)`,
      [userId, e.courseCode, e.section],
    );
  }
}

async function replacePortfolio(
  conn: PoolConnection,
  userId: number,
  items: (Pick<
    Project,
    "id" | "title" | "description" | "tags" | "year"
  > & { link?: string })[],
) {
  await conn.execute("DELETE FROM user_portfolio_projects WHERE user_id = ?", [
    userId,
  ]);
  for (const p of items) {
    await conn.execute(
      `INSERT INTO user_portfolio_projects (user_id, pid, title, description, year, tags_json, link)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
  conn: PoolConnection,
  userId: number,
  items: (Pick<Achievement, "id" | "title" | "year"> & {
    description?: string;
    type?: Achievement["type"];
  })[],
) {
  await conn.execute("DELETE FROM user_achievements WHERE user_id = ?", [
    userId,
  ]);
  for (const a of items) {
    await conn.execute(
      `INSERT INTO user_achievements (user_id, aid, title, description, year, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [head] = await conn.execute<ResultSetHeader>(
      "INSERT INTO users (student_id, handle, password_hash) VALUES (?, ?, ?)",
      [input.studentId, input.profile.handle, passwordHash],
    );
    const uid = Number(head.insertId);
    if (!uid) throw new Error("Signup insert failed");

    const p = input.profile;
    await conn.execute(
      `INSERT INTO user_profiles (
        user_id, display_name, department, faculty, semester, bio, vibe,
        is_mentor, joined_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        uid,
        p.name,
        p.department,
        p.faculty,
        p.semester,
        p.bio ?? "",
        p.vibe ?? "",
        p.isMentor ? 1 : 0,
      ],
    );

    await replaceSkills(conn, uid, p.skills);
    await replaceInterests(conn, uid, p.interests);
    await replaceOpenness(conn, uid, p.openTo);
    await replaceEnrollments(conn, uid, p.courseEnrollments);
    await replacePortfolio(conn, uid, p.projects ?? []);
    await replaceAchievements(conn, uid, p.achievements ?? []);

    await conn.commit();
    return uid;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function loadStudent(
  pool: Pool,
  userId: number,
): Promise<Student | null> {
  const [[uRows], [pRows]] = await Promise.all([
    pool.execute<UserRow[] & RowDataPacket[]>(
      "SELECT id, student_id, handle FROM users WHERE id = ? LIMIT 1",
      [userId],
    ),
    pool.execute<RowDataPacket[]>(
      "SELECT display_name AS display_name, department, faculty, semester, bio, vibe, " +
        "is_mentor, avatar_storage_path, github, linkedin, website, joined_at " +
        "FROM user_profiles WHERE user_id = ? LIMIT 1",
      [userId],
    ),
  ]);

  const user = uRows[0];
  const profileRow = (pRows as Record<string, unknown>[])[0];
  if (!user || !profileRow) return null;

  const [[skRows], [inRows], [opRows], [enRows], [pjRows], [achRows]] =
    await Promise.all([
      pool.execute<RowDataPacket[]>(
        "SELECT skill FROM user_skills WHERE user_id = ? ORDER BY skill ASC",
        [userId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT interest FROM user_interests WHERE user_id = ? ORDER BY interest ASC`,
        [userId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT label FROM user_openness WHERE user_id = ? ORDER BY label ASC`,
        [userId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT course_code, section FROM user_enrollments WHERE user_id = ? ORDER BY course_code ASC`,
        [userId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT pid, title, description, year, tags_json, link
         FROM user_portfolio_projects WHERE user_id = ? ORDER BY id DESC`,
        [userId],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT aid, title, description, year, type
         FROM user_achievements WHERE user_id = ? ORDER BY id DESC`,
        [userId],
      ),
    ]);

  const skills = ((skRows as { skill: string }[]) ?? []).map((r) => r.skill);
  const interests = ((inRows as { interest: string }[]) ?? []).map(
    (r) => r.interest,
  );
  const openTo = (((opRows as { label: string }[]) ?? []).map((r) => r.label) ??
    []) as Student["openTo"];
  const enrollments: CourseEnrollment[] = ((enRows as {
    course_code: string;
    section: string;
  }[]) ?? []).map((r) => ({
    courseCode: r.course_code,
    section: r.section,
  }));
  const currentCourses = enrollments.map((e) => e.courseCode);

  const projects: Project[] = ((pjRows as Record<string, unknown>[]) ?? []).map(
    (r) => ({
      id: String(r.pid),
      title: String(r.title ?? ""),
      description: String(r.description ?? ""),
      tags: r.tags_json
        ? (JSON.parse(String(r.tags_json)) as string[])
        : [],
      year: Number(r.year),
      link:
        typeof r.link === "string" && r.link.trim()
          ? r.link
          : undefined,
    }),
  );

  const achievements: Achievement[] = (
    (achRows as Record<string, unknown>[]) ?? []
  ).map((r) => ({
    id: String(r.aid),
    title: String(r.title ?? ""),
    description:
      typeof r.description === "string"
        ? r.description
        : undefined,
    year: Number(r.year),
    type: (r.type as Achievement["type"]) ?? "academic",
  }));

  let profileImageUrl: string | undefined;
  const ap = String(profileRow.avatar_storage_path ?? "").trim();
  if (ap) {
    profileImageUrl = `/${ap.replace(/^\/+/, "")}`;
  }

  const sem = Number(profileRow.semester);
  const gh = profileRow.github as string | null;
  const li = profileRow.linkedin as string | null;
  const ws = profileRow.website as string | null;

  return {
    id: String(user.id),
    userNumber: user.id,
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
    isMentor: !!(profileRow.is_mentor as number),
    links:
      gh || li || ws
        ? {
            ...(gh?.trim()
              ? { github: gh }
              : {}),
            ...(li?.trim()
              ? { linkedin: li }
              : {}),
            ...(ws?.trim()
              ? { website: ws }
              : {}),
          }
        : undefined,
    joinedAt:
      typeof profileRow.joined_at === "string"
        ? profileRow.joined_at
        : new Date(profileRow.joined_at as Date).toISOString(),
    profileImageUrl,
  };
}

export async function isHandleTaken(
  pool: Pool,
  handle: string,
  exceptUserId?: number,
): Promise<boolean> {
  const q =
    exceptUserId != null
      ? `SELECT id FROM users WHERE handle = ? AND id <> ? LIMIT 1`
      : `SELECT id FROM users WHERE handle = ? LIMIT 1`;
  const args =
    exceptUserId != null ? [handle, exceptUserId] : [handle];
  const [rows] = await pool.execute<RowDataPacket[]>(q, args);
  return rows.length > 0;
}

export async function updatePasswordHash(
  pool: Pool,
  userId: number,
  passwordHash: string,
) {
  await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
    passwordHash,
    userId,
  ]);
}

export async function setAvatarPath(
  pool: Pool,
  userId: number,
  relativePath: string | null,
) {
  await pool.execute(
    "UPDATE user_profiles SET avatar_storage_path = ? WHERE user_id = ?",
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (patch.handle != null) {
      await conn.execute("UPDATE users SET handle = ? WHERE id = ?", [
        patch.handle,
        userId,
      ]);
    }

    const assigns: string[] = [];
    const vals: unknown[] = [];
    if (patch.display_name != null) {
      assigns.push("display_name = ?");
      vals.push(patch.display_name);
    }
    if (patch.department != null) {
      assigns.push("department = ?");
      vals.push(patch.department);
    }
    if (patch.faculty != null) {
      assigns.push("faculty = ?");
      vals.push(patch.faculty);
    }
    if (patch.semester != null) {
      assigns.push("semester = ?");
      vals.push(patch.semester);
    }
    if (patch.bio != null) {
      assigns.push("bio = ?");
      vals.push(patch.bio);
    }
    if (patch.vibe != null) {
      assigns.push("vibe = ?");
      vals.push(patch.vibe);
    }
    if (patch.isMentor != null) {
      assigns.push("is_mentor = ?");
      vals.push(patch.isMentor ? 1 : 0);
    }
    if (patch.github !== undefined) {
      assigns.push("github = ?");
      vals.push(patch.github);
    }
    if (patch.linkedin !== undefined) {
      assigns.push("linkedin = ?");
      vals.push(patch.linkedin);
    }
    if (patch.website !== undefined) {
      assigns.push("website = ?");
      vals.push(patch.website);
    }
    if (assigns.length > 0) {
      await conn.query(
        `UPDATE user_profiles SET ${assigns.join(", ")} WHERE user_id = ?`,
        [...vals, userId],
      );
    }

    if (patch.skills) await replaceSkills(conn, userId, patch.skills);
    if (patch.interests) await replaceInterests(conn, userId, patch.interests);
    if (patch.openTo) await replaceOpenness(conn, userId, patch.openTo as string[]);
    if (patch.enrollments)
      await replaceEnrollments(conn, userId, patch.enrollments);
    if (patch.projects)
      await replacePortfolio(conn, userId, patch.projects);
    if (patch.achievements)
      await replaceAchievements(conn, userId, patch.achievements);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
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

  if (opts.excludeIds?.length) {
    clauses.push(
      `u.id NOT IN (${opts.excludeIds.map(() => "?").join(",")})`,
    );
    params.push(...opts.excludeIds);
  }

  if (opts.department) {
    clauses.push("p.department = ?");
    params.push(opts.department);
  }

  const raw = opts.q?.trim().slice(0, 96);
  if (raw) {
    const term = raw.replace(/[%_]/g, "").trim();
    const pat =
      term.length > 0 ? `%${term}%` : `%${raw.replace(/[%_]/g, "")}%`;
    const idPrefixPat = /^[0-9]+$/.test(term) ? `${term}%` : null;

    clauses.push(`(
      LOWER(u.handle) LIKE LOWER(?)
      OR p.display_name LIKE ?
      OR u.student_id LIKE ?
      OR REPLACE(REPLACE(u.student_id,'-',''),' ','') LIKE REPLACE(REPLACE(?,'-',''),' ','')
      ${idPrefixPat ? " OR CAST(u.id AS CHAR) LIKE ? OR u.id = ?" : ""}
    )`);

    const compactStudent = term.toUpperCase().replace(/[^\d]/g, "");
    params.push(pat, pat, pat.toUpperCase(), `%${compactStudent}%`);
    if (idPrefixPat) {
      const idNum = Number(term);
      params.push(idPrefixPat, Number.isFinite(idNum) ? idNum : -1);
    }
  }

  const sql = `
    SELECT u.id FROM users u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE ${clauses.join(" AND ")}
    ORDER BY p.joined_at DESC
    LIMIT ${limit}`;
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return (rows ?? []).map((r) => Number(r.id)).filter(Number.isFinite);
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
  const params: unknown[] = [opts.courseCode];
  let sectionClause = "";
  if (opts.section?.trim()) {
    sectionClause = " AND e.section = ?";
    params.push(opts.section.trim());
  }
  params.push(opts.excludeUserId ?? 0);

  const sql =
    `SELECT DISTINCT e.user_id AS id FROM user_enrollments e
      WHERE e.course_code = ? ${sectionClause}
      AND e.user_id <> ?
      ORDER BY id ASC LIMIT ${lim}`;

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return (rows ?? []).map((r) => Number(r.id)).filter(Number.isFinite);
}

export async function deleteUser(pool: Pool, userId: number) {
  await pool.execute<ResultSetHeader>("DELETE FROM users WHERE id = ?", [
    userId,
  ]);
}
