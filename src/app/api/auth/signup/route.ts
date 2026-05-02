import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import { hashPassword } from "@/server/password-auth";
import {
  signupUser,
  fetchUserCredentials,
  fetchUserStudentId,
  isHandleTaken,
  loadStudent,
} from "@/server/user-repository";
import { passwordSchema, signupPayloadSchema } from "@/server/validation";
import { attachSessionCookie } from "@/server/session-cookie";
import {
  listBookmarkTargetIds,
  loadConnectionMap,
} from "@/server/social-repository";
import { normalizeStudentId } from "@/server/student-mask";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid-json", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = signupPayloadSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(" · ") || "Invalid data";
    return NextResponse.json(
      { ok: false, code: "validation", message: msg, issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const pwd = passwordSchema({
    name: data.profile.name,
    handle: data.profile.handle,
    studentId: data.studentId,
  }).safeParse(data.password);

  if (!pwd.success) {
    const msg = pwd.error.issues.map((e) => e.message).join(" · ");
    return NextResponse.json(
      { ok: false, code: "weak-password", message: msg },
      { status: 400 },
    );
  }

  const pool = getPool();

  try {
    const existed = await fetchUserCredentials(
      pool,
      normalizeStudentId(data.studentId),
    );
    if (existed) {
      return NextResponse.json({
        ok: false,
        code: "id-taken",
        message:
          "An account already exists with this AIUB student ID. Sign in instead.",
      });
    }
    if (await isHandleTaken(pool, data.profile.handle)) {
      return NextResponse.json({
        ok: false,
        code: "handle-taken",
        message: "This handle is already taken.",
      });
    }

    const hash = await hashPassword(data.password);
    let uid: number;
    try {
      uid = await signupUser(pool, data, hash);
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === "ER_DUP_ENTRY") {
        return NextResponse.json({
          ok: false,
          code: "duplicate",
          message: "That student ID or handle is already registered.",
        });
      }
      throw err;
    }

    const student = await loadStudent(pool, uid);
    if (!student) {
      return NextResponse.json(
        { ok: false, message: "Signup partially failed" },
        { status: 500 },
      );
    }

    const [signedStudentId, connections, bookmarks] = await Promise.all([
      fetchUserStudentId(pool, uid),
      loadConnectionMap(pool, uid),
      listBookmarkTargetIds(pool, uid),
    ]);

    const res = NextResponse.json({
      ok: true,
      student,
      signedStudentId,
      connections,
      bookmarks,
    });

    attachSessionCookie(res, uid);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error", code: "server" },
      { status: 500 },
    );
  }
}
