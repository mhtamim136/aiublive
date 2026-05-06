import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import { listMyThreads } from "@/server/messages-repository";

export const runtime = "nodejs";

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
    const threads = await listMyThreads(pool, uid);
    return NextResponse.json({ ok: true, threads });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}
