import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import {
  acceptConnectionByPeer,
  createConnectionRequest,
  loadConnectionMap,
} from "@/server/social-repository";

export const runtime = "nodejs";

const peerSchema = z.object({
  peerUserId: z.string().regex(/^[0-9]+$/),
  action: z
    .enum(["request", "accept-incoming", "complete-outgoing-demo"])
    .optional()
    .default("request"),
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

  const b = peerSchema.safeParse(json);
  if (!b.success) {
    return NextResponse.json(
      { ok: false, message: "Bad payload" },
      { status: 400 },
    );
  }

  const peerId = Number(b.data.peerUserId);
  if (!Number.isFinite(peerId)) {
    return NextResponse.json({ ok: false, message: "Bad id" }, { status: 400 });
  }

  try {
    const pool = getPool();

    if (b.data.action === "accept-incoming") {
      await acceptConnectionByPeer(pool, uid, peerId);
    } else if (b.data.action === "complete-outgoing-demo") {
      await pool.execute(
        `UPDATE connections SET status = 'connected'
         WHERE requester_id = ? AND peer_id = ? AND status = 'pending'`,
        [uid, peerId],
      );
    } else {
      const ok = await createConnectionRequest(pool, uid, peerId);
      if (!ok) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "A connection record already exists for this pair of students.",
          },
          { status: 409 },
        );
      }
    }

    const connections = await loadConnectionMap(pool, uid);
    return NextResponse.json({ ok: true, connections });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Could not save connection" },
      { status: 500 },
    );
  }
}
