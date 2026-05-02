import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/server/db";
import { verifyPassword, hashPassword } from "@/server/password-auth";
import {
  fetchUserCredentials,
  fetchUserStudentId,
  loadStudent,
  updatePasswordHash,
} from "@/server/user-repository";
import {
  normalizeStudentId,
  STUDENT_ID_REGEX,
} from "@/server/student-mask";
import { passwordSchema } from "@/server/validation";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";

export const runtime = "nodejs";

const bodySchema = z.object({
  studentId: z.string().trim().transform((s) => s.toUpperCase()),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
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
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const b = bodySchema.safeParse(json);
  if (!b.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload" },
      { status: 400 },
    );
  }

  if (!STUDENT_ID_REGEX.test(b.data.studentId)) {
    return NextResponse.json(
      { ok: false, code: "invalid-id", message: "Invalid student ID format" },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();

    const cred = await fetchUserCredentials(
      pool,
      normalizeStudentId(b.data.studentId),
    );
    if (!cred || cred.id !== uid) {
      return NextResponse.json({
        ok: false,
        code: "wrong-current",
        message: "Current password is incorrect.",
      });
    }

    const okCur = await verifyPassword(
      b.data.currentPassword,
      cred.password_hash,
    );
    if (!okCur) {
      return NextResponse.json({
        ok: false,
        code: "wrong-current",
        message: "Current password is incorrect.",
      });
    }

    const same = await verifyPassword(b.data.newPassword, cred.password_hash);
    if (same) {
      return NextResponse.json({
        ok: false,
        code: "same-as-current",
        message:
          "New password must be different from your current password.",
      });
    }

    const [meMini, canonId] = await Promise.all([
      loadStudent(pool, uid),
      fetchUserStudentId(pool, uid),
    ]);

    const report = passwordSchema({
      name: meMini?.name,
      handle: meMini?.handle ?? cred.handle,
      studentId: canonId ?? b.data.studentId,
    }).safeParse(b.data.newPassword);

    if (!report.success) {
      return NextResponse.json({
        ok: false,
        code: "weak-new",
        message:
          report.error.issues.map((e) => e.message).join(" · ") || "Weak password",
      });
    }

    await updatePasswordHash(pool, uid, await hashPassword(b.data.newPassword));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}
