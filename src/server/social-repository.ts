import type { Pool } from "pg";
import type { ConnectionStatus } from "@/lib/types";

export async function loadConnectionMap(
  pool: Pool,
  viewerId: number,
): Promise<Record<string, ConnectionStatus>> {
  const out = await pool.query<{
    peer_id: number;
    status: string;
  }>(
    `SELECT peer_id, status FROM connections
     WHERE requester_id = $1 AND status IN ('pending','connected')`,
    [viewerId],
  );

  const inn = await pool.query<{
    requester_id: number;
    status: string;
  }>(
    `SELECT requester_id, status FROM connections
     WHERE peer_id = $1 AND status = 'connected'`,
    [viewerId],
  );

  const map: Record<string, ConnectionStatus> = {};
  for (const r of out.rows) {
    map[String(r.peer_id)] =
      r.status === "connected" ? "connected" : "pending";
  }
  for (const r of inn.rows) {
    map[String(r.requester_id)] = "connected";
  }
  return map;
}

export async function createConnectionRequest(
  pool: Pool,
  requesterId: number,
  peerId: number,
) {
  if (peerId === requesterId) return false;
  const dup = await pool.query(
    `SELECT id FROM connections
     WHERE (requester_id = $1 AND peer_id = $2)
        OR (requester_id = $2 AND peer_id = $1)
     LIMIT 1`,
    [requesterId, peerId],
  );
  if ((dup.rowCount ?? 0) > 0) return false;
  await pool.query(
    `INSERT INTO connections (requester_id, peer_id, status)
     VALUES ($1, $2, 'pending')`,
    [requesterId, peerId],
  );
  return true;
}

export async function acceptConnectionByPeer(
  pool: Pool,
  viewerId: number,
  peerId: number,
) {
  await pool.query(
    `UPDATE connections SET status = 'connected'
     WHERE peer_id = $1 AND requester_id = $2 AND status = 'pending'`,
    [viewerId, peerId],
  );
}

/**
 * Demo-only: mark an outgoing pending request as connected from the
 * requester's side. Used by the connections page's "Mark accepted" button.
 */
export async function completeOutgoingRequestAsConnected(
  pool: Pool,
  requesterId: number,
  peerId: number,
) {
  await pool.query(
    `UPDATE connections SET status = 'connected'
     WHERE requester_id = $1 AND peer_id = $2 AND status = 'pending'`,
    [requesterId, peerId],
  );
}

export async function listBookmarkTargetIds(
  pool: Pool,
  viewerId: number,
): Promise<string[]> {
  const r = await pool.query<{ target_user_id: number }>(
    `SELECT target_user_id FROM bookmarks
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [viewerId],
  );
  return r.rows.map((row) => String(row.target_user_id));
}

export async function setBookmark(
  pool: Pool,
  viewerId: number,
  targetId: number,
  on: boolean,
) {
  if (targetId === viewerId) return;
  if (!on) {
    await pool.query(
      "DELETE FROM bookmarks WHERE user_id = $1 AND target_user_id = $2",
      [viewerId, targetId],
    );
    return;
  }
  await pool.query(
    `INSERT INTO bookmarks (user_id, target_user_id) VALUES ($1, $2)
     ON CONFLICT (user_id, target_user_id) DO NOTHING`,
    [viewerId, targetId],
  );
}
