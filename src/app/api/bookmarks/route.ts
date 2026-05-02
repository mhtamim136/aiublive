import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import {
  listBookmarkTargetIds,
  setBookmark,
} from "@/server/social-repository";

export const runtime = "nodejs";

const toggleSchema = z.object({
  targetUserId: z.string().regex(/^[0-9]+$/),
  on: z.boolean(),
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

  const b = toggleSchema.safeParse(json);
  if (!b.success) {
    return NextResponse.json(
      { ok: false, message: "Bad payload" },
      { status: 400 },
    );
  }

  const target = Number(b.data.targetUserId);
  if (!Number.isFinite(target)) {
    return NextResponse.json({ ok: false, message: "Bad id" }, { status: 400 });
  }

  try {
    const pool = getPool();
    await setBookmark(pool, uid, target, b.data.on);
    const bookmarks = await listBookmarkTargetIds(pool, uid);
    return NextResponse.json({ ok: true, bookmarks });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Bookmark failed" },
      { status: 500 },
    );
  }
}

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
    const bookmarks = await listBookmarkTargetIds(pool, uid);
    return NextResponse.json({ ok: true, bookmarks });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
