import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import { verifyPassword } from "@/server/password-auth";
import {
  applyFailedLogin,
  fetchUserCredentials,
  fetchUserStudentId,
  loadStudent,
  resetLoginFailures,
} from "@/server/user-repository";
import { normalizeStudentId, STUDENT_ID_REGEX } from "@/server/student-mask";
import {
  attachSessionCookie,
  clearSessionOnResponse,
} from "@/server/session-cookie";
import {
  listBookmarkTargetIds,
  loadConnectionMap,
} from "@/server/social-repository";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { studentId?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid-json", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const studentIdRaw = String(body.studentId ?? "").trim().toUpperCase();
  const password = String(body.password ?? "");
  if (!STUDENT_ID_REGEX.test(studentIdRaw) || password.length < 1) {
    return NextResponse.json({
      ok: false,
      code: "wrong-credentials",
      message:
        "We couldn't find an account with that ID and password.",
    });
  }

  try {
    const pool = getPool();
    const norm = normalizeStudentId(studentIdRaw);
    const user = await fetchUserCredentials(pool, norm);

    if (!user) {
      return NextResponse.json({
        ok: false,
        code: "wrong-credentials",
        message:
          "We couldn't find an account with that ID and password.",
      });
    }

    const now = Date.now();
    if (user.locked_until && new Date(user.locked_until).getTime() > now) {
      return NextResponse.json({
        ok: false,
        code: "locked",
        message: "Too many failed attempts. Try again in a few minutes.",
        lockedUntil: new Date(user.locked_until).getTime(),
      });
    }

    const match = await verifyPassword(password, user.password_hash);
    if (!match) {
      const r = await applyFailedLogin(pool, user.id);
      if (r.lockedUntilMs) {
        return NextResponse.json({
          ok: false,
          code: "locked",
          message:
            "Too many failed attempts. Account temporarily locked for 5 minutes.",
          lockedUntil: r.lockedUntilMs,
        });
      }
      return NextResponse.json({
        ok: false,
        code: "wrong-password",
        message:
          "We couldn't find an account with that ID and password.",
        remainingAttempts: r.remainingBeforeLock,
      });
    }

    await resetLoginFailures(pool, user.id);

    const student = await loadStudent(pool, user.id);
    if (!student) {
      const res = NextResponse.json(
        { ok: false, code: "no-profile", message: "Incomplete account" },
        { status: 500 },
      );
      clearSessionOnResponse(res);
      return res;
    }

    const [signedStudentId, connections, bookmarks] = await Promise.all([
      fetchUserStudentId(pool, user.id),
      loadConnectionMap(pool, user.id),
      listBookmarkTargetIds(pool, user.id),
    ]);

    const res = NextResponse.json({
      ok: true,
      name: student.name,
      student,
      signedStudentId,
      connections,
      bookmarks,
    });

    attachSessionCookie(res, user.id);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error", code: "server" },
      { status: 500 },
    );
  }
}
