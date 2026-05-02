import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { ConnectionStatus } from "@/lib/types";

export async function loadConnectionMap(
  pool: Pool,
  viewerId: number,
): Promise<Record<string, ConnectionStatus>> {
  const [outRows] = await pool.execute<RowDataPacket[]>(
    `SELECT peer_id, status FROM connections
     WHERE requester_id = ? AND status IN ('pending','connected')`,
    [viewerId],
  );
  const [inRows] = await pool.execute<RowDataPacket[]>(
    `SELECT requester_id, status FROM connections
     WHERE peer_id = ? AND status = 'connected'`,
    [viewerId],
  );

  const map: Record<string, ConnectionStatus> = {};
  for (const r of outRows ?? []) {
    map[String(r.peer_id)] =
      String(r.status) === "connected" ? "connected" : "pending";
  }
  for (const r of inRows ?? []) {
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
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM connections
     WHERE (requester_id = ? AND peer_id = ?) OR (requester_id = ? AND peer_id = ?)
     LIMIT 1`,
    [requesterId, peerId, peerId, requesterId],
  );
  if (rows?.length) return false;
  await pool.execute<ResultSetHeader>(
    "INSERT INTO connections (requester_id, peer_id, status) VALUES (?, ?, 'pending')",
    [requesterId, peerId],
  );
  return true;
}

export async function acceptConnectionByPeer(
  pool: Pool,
  viewerId: number,
  peerId: number,
) {
  await pool.execute(
    `UPDATE connections SET status = 'connected'
     WHERE peer_id = ? AND requester_id = ? AND status = 'pending'`,
    [viewerId, peerId],
  );
}

export async function listBookmarkTargetIds(
  pool: Pool,
  viewerId: number,
): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT target_user_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC",
    [viewerId],
  );
  return (rows ?? []).map((r) => String(r.target_user_id));
}

export async function isBookmarked(
  pool: Pool,
  viewerId: number,
  targetId: number,
) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT 1 FROM bookmarks WHERE user_id = ? AND target_user_id = ? LIMIT 1",
    [viewerId, targetId],
  );
  return !!(rows ?? []).length;
}

export async function setBookmark(
  pool: Pool,
  viewerId: number,
  targetId: number,
  on: boolean,
) {
  if (targetId === viewerId) return;
  if (!on) {
    await pool.execute(
      "DELETE FROM bookmarks WHERE user_id = ? AND target_user_id = ?",
      [viewerId, targetId],
    );
    return;
  }
  await pool.execute(
    `INSERT IGNORE INTO bookmarks (user_id, target_user_id) VALUES (?, ?)`,
    [viewerId, targetId],
  );
}
