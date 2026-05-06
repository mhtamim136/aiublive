import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import { popularCoursesExcluding } from "@/server/stats-repository";
import { loadStudent } from "@/server/user-repository";

export const runtime = "nodejs";
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
      return NextResponse.json({ ok: true, suggestions: [] });
    }
    const suggestions = await popularCoursesExcluding(
      pool,
      uid,
      me.currentCourses,
      4,
    );
    return NextResponse.json({ ok: true, suggestions });
  } catch (e) {
    console.error("[coursemates/suggestions]", e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}
