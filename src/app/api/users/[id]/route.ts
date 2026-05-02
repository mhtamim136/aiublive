import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import { loadStudent } from "@/server/user-repository";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await ctx.params;
  const uid = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(uid) || uid <= 0) {
    return NextResponse.json({ ok: false, message: "Bad id" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const student = await loadStudent(pool, uid);
    if (!student) {
      return NextResponse.json(
        { ok: false, message: "Not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, student });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
