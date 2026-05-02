import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import {
  normalizeStudentId,
  STUDENT_ID_REGEX,
} from "@/server/student-mask";
import { fetchUserCredentials } from "@/server/user-repository";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = String(url.searchParams.get("studentId") ?? "").trim();
  const norm =
    STUDENT_ID_REGEX.test(raw.toUpperCase()) ?
      normalizeStudentId(raw.toUpperCase())
    : null;

  if (!norm) {
    return NextResponse.json({ ok: true, exists: false, valid: false });
  }

  try {
    const pool = getPool();
    const row = await fetchUserCredentials(pool, norm);
    return NextResponse.json({ ok: true, exists: !!row, valid: true });
  } catch {
    return NextResponse.json({ ok: false, exists: false, valid: true });
  }
}
