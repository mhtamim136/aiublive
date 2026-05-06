import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import {
  listMessagesWithPeer,
  sendMessage,
} from "@/server/messages-repository";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const uid = getSessionUserIdFromCookies();
  if (uid == null) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const url = new URL(req.url);
  const peer = url.searchParams.get("peer");
  if (!peer || !/^[0-9]+$/.test(peer)) {
    return NextResponse.json(
      { ok: false, message: "peer query param required" },
      { status: 400 },
    );
  }
  const peerId = Number(peer);
  if (peerId === uid) {
    return NextResponse.json({ ok: true, thread: null, messages: [] });
  }
  try {
    const pool = getPool();
    const result = await listMessagesWithPeer(pool, uid, peerId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}

const sendSchema = z.object({
  peerUserId: z.string().regex(/^[0-9]+$/),
  body: z.string().trim().min(1).max(4000),
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
  const parsed = sendSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Bad payload" },
      { status: 400 },
    );
  }
  const peerId = Number(parsed.data.peerUserId);
  if (peerId === uid) {
    return NextResponse.json(
      { ok: false, message: "Cannot message yourself" },
      { status: 400 },
    );
  }
  try {
    const pool = getPool();
    const msg = await sendMessage(pool, uid, peerId, parsed.data.body);
    if (!msg) {
      return NextResponse.json(
        { ok: false, message: "Could not send" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, message: msg });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}
