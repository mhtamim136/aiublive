import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/server/db";
import { deleteUser } from "@/server/user-repository";
import { fetchUserCredentials, fetchUserStudentId } from "@/server/user-repository";
import { normalizeStudentId, STUDENT_ID_REGEX } from "@/server/student-mask";
import { verifyPassword } from "@/server/password-auth";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import { clearSessionOnResponse } from "@/server/session-cookie";

export const runtime = "nodejs";

const deleteSchema = z.object({
  studentId: z.string().trim().transform((s) => s.toUpperCase()),
  password: z.string().min(1),
});

export async function DELETE(req: Request) {
  const uid = getSessionUserIdFromCookies();
  if (uid == null) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Expected JSON body" },
      { status: 400 },
    );
  }

  const b = deleteSchema.safeParse(json);
  if (!b.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload" },
      { status: 400 },
    );
  }
  if (!STUDENT_ID_REGEX.test(b.data.studentId)) {
    return NextResponse.json(
      { ok: false, message: "Invalid student ID format" },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();
    const canon = await fetchUserStudentId(pool, uid);
    const normIncoming = normalizeStudentId(b.data.studentId);
    if (!canon || normalizeStudentId(canon) !== normIncoming) {
      return NextResponse.json(
        { ok: false, message: "Student ID does not match this session." },
        { status: 403 },
      );
    }

    const cred = await fetchUserCredentials(pool, normIncoming);
    if (!cred || cred.id !== uid) {
      return NextResponse.json(
        { ok: false, message: "Account mismatch" },
        { status: 403 },
      );
    }

    const ok = await verifyPassword(b.data.password, cred.password_hash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, code: "wrong-password", message: "Wrong password." },
        { status: 403 },
      );
    }

    await deleteUser(pool, uid);

    const res = NextResponse.json({ ok: true });
    clearSessionOnResponse(res);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}
