import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import {
  fetchUserStudentId,
  loadStudent,
} from "@/server/user-repository";
import {
  listBookmarkTargetIds,
  loadConnectionMap,
} from "@/server/social-repository";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";

export const runtime = "nodejs";

export async function GET() {
  const uid = getSessionUserIdFromCookies();
  if (uid == null) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const pool = getPool();
    const [student, signedStudentId, connections, bookmarks] =
      await Promise.all([
        loadStudent(pool, uid),
        fetchUserStudentId(pool, uid),
        loadConnectionMap(pool, uid),
        listBookmarkTargetIds(pool, uid),
      ]);
    if (!student) {
      return NextResponse.json(
        { ok: false, error: "Profile missing" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      student,
      signedStudentId,
      connections,
      bookmarks,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
