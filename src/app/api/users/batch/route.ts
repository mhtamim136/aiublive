import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/server/db";
import { loadStudent } from "@/server/user-repository";

export const runtime = "nodejs";

const qp = z.string().regex(/^[0-9,]{1,4096}$/);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsRaw = url.searchParams.get("ids") ?? "";
  const cleaned = idsRaw.replace(/\s+/g, "");
  const safe = qp.safeParse(cleaned);
  if (!safe.success || !cleaned) {
    return NextResponse.json(
      { ok: false, message: "ids query must be comma-separated numbers" },
      { status: 400 },
    );
  }

  const ids = [...new Set(cleaned.split(","))]
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x > 0)
    .slice(0, 120);

  try {
    const pool = getPool();
    const students = (
      await Promise.all(ids.map((id) => loadStudent(pool, id)))
    ).filter(Boolean);
    return NextResponse.json({ ok: true, students });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Batch load failed" }, { status: 500 });
  }
}
