import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import { loadStudent, loadStudentsBatch } from "@/server/user-repository";
import { loadDashboardStats, rankDailyPicks } from "@/server/stats-repository";
import { matchReasons } from "@/lib/match";

export const runtime = "nodejs";
// Per-user data — never cache at the edge.
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = getSessionUserIdFromCookies();
  if (uid == null) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const pool = getPool();
    const me = await loadStudent(pool, uid);
    if (!me) {
      return NextResponse.json(
        { ok: false, message: "Profile missing" },
        { status: 404 },
      );
    }

    const [stats, pickIds] = await Promise.all([
      loadDashboardStats(pool, uid, me.currentCourses, me.department),
      rankDailyPicks(
        pool,
        {
          id: uid,
          department: me.department,
          semester: me.semester,
          skills: me.skills,
          interests: me.interests,
          courses: me.currentCourses,
        },
        6,
      ),
    ]);

    const ranked = (await loadStudentsBatch(pool, pickIds)).filter(
      (s): s is NonNullable<typeof s> => s !== null,
    );

    const dailyPicks = ranked.slice(0, 3).map((s) => ({
      student: s,
      reasons: matchReasons(me, s),
    }));

    return NextResponse.json({
      ok: true,
      stats,
      dailyPicks,
    });
  } catch (e) {
    console.error("[stats/dashboard]", e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}
