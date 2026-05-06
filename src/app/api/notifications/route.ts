import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from "@/server/notifications-repository";

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
    const [items, unread] = await Promise.all([
      listNotifications(pool, uid, 30),
      unreadNotificationCount(pool, uid),
    ]);
    return NextResponse.json({ ok: true, notifications: items, unread });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}

const markBody = z.object({
  // null/undefined → mark all; otherwise only the listed ids.
  ids: z.array(z.number().int().positive()).max(100).nullable().optional(),
});

export async function POST(req: Request) {
  const uid = getSessionUserIdFromCookies();
  if (uid == null) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    // empty body is fine — treated as "mark all"
  }
  const parsed = markBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Bad payload" },
      { status: 400 },
    );
  }
  try {
    const pool = getPool();
    await markNotificationsRead(
      pool,
      uid,
      parsed.data.ids === undefined ? null : parsed.data.ids,
    );
    const unread = await unreadNotificationCount(pool, uid);
    return NextResponse.json({ ok: true, unread });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}
