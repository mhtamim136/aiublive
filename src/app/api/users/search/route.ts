import { NextResponse } from "next/server";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import { loadStudent, searchPublicStudents } from "@/server/user-repository";
import type { Department } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const viewer = getSessionUserIdFromCookies();

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const deptParam = url.searchParams.get("department");
    const limit = Number(url.searchParams.get("limit") ?? "60");

    const dept =
      deptParam && deptParam !== "all" ? (deptParam as Department) : undefined;

    const pool = getPool();

    const ids = await searchPublicStudents(pool, {
      q,
      department: dept,
      excludeIds: viewer != null ? [viewer] : [],
      limit: Number.isFinite(limit) ? limit : 60,
    });

    const students = (
      await Promise.all(ids.map((id) => loadStudent(pool, id)))
    ).filter(Boolean);

    return NextResponse.json({ ok: true, students });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Search failed" },
      { status: 500 },
    );
  }
}
