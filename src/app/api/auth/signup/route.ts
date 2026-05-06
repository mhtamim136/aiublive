import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import { hashPassword } from "@/server/password-auth";
import {
  signupUser,
  fetchUserCredentials,
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
  const normalizedStudentId = normalizeStudentId(data.studentId);

  try {
    // Run the two pre-checks AND the bcrypt hash in parallel — they're
    // independent and bcrypt (cost 10) is the longest single step on the
    // critical path. This overlaps ~120 ms of CPU with ~2 DB round trips.
    const [existed, handleTaken, hash] = await Promise.all([
      fetchUserCredentials(pool, normalizedStudentId),
      isHandleTaken(pool, data.profile.handle),
      hashPassword(data.password),
    ]);

    if (existed) {
      return NextResponse.json({
        ok: false,
        code: "id-taken",
        message:
          "An account already exists with this AIUB student ID. Sign in instead.",
      });
    }
    if (handleTaken) {
      return NextResponse.json({
        ok: false,
        code: "handle-taken",
        message: "This handle is already taken.",
      });
    }

    let uid: number;
    try {
      uid = await signupUser(pool, data, hash);
    } catch (err) {
      const e = err as { code?: string };
      // PostgreSQL unique-violation SQLSTATE.
      if (e?.code === "23505") {
        return NextResponse.json({
          ok: false,
          code: "duplicate",
          message: "That student ID or handle is already registered.",
        });
      }
      throw err;
    }

    // Post-insert reads in one parallel batch (loadStudent is no longer
    // awaited before the connections/bookmarks fan-out).
    const [student, connections, bookmarks] = await Promise.all([
      loadStudent(pool, uid),
      loadConnectionMap(pool, uid),
      listBookmarkTargetIds(pool, uid),
    ]);

    if (!student) {
      return NextResponse.json(
        { ok: false, message: "Signup partially failed" },
        { status: 500 },
      );
    }

    const res = NextResponse.json({
      ok: true,
      student,
      // Reuse the normalized id we already computed instead of re-querying.
      signedStudentId: normalizedStudentId,
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
