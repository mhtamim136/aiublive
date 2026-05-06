import type { Pool } from "pg";
import { emitToUser } from "./realtime";

export type NotificationKind =
  | "connection-request"
  | "connection-accepted"
  | "message"
  | "team-activity";

export type NotificationRow = {
  id: number;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  read_at: Date | string | null;
  created_at: Date | string;
};

/**
 * Persist a notification AND fire it to any open SSE stream for the user.
 * Both happen in the same call so the API caller doesn't have to remember
 * to do them in the right order.
 */
export async function createNotification(
  pool: Pool,
  userId: number,
  kind: NotificationKind,
  payload: Record<string, unknown>,
) {
  const r = await pool.query<NotificationRow>(
    `INSERT INTO notifications (user_id, kind, payload)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, kind, payload, read_at, created_at`,
    [userId, kind, JSON.stringify(payload)],
  );
  const row = r.rows[0];
  if (row) {
    emitToUser(userId, {
      type: "notification",
      data: {
        id: Number(row.id),
        kind: String(row.kind),
        payload: payload,
        createdAt:
          typeof row.created_at === "string"
            ? row.created_at
            : new Date(row.created_at).toISOString(),
      },
    });
  }
  return row;
}

export async function listNotifications(
  pool: Pool,
  userId: number,
  limit = 30,
): Promise<
  {
    id: number;
    kind: NotificationKind;
    payload: Record<string, unknown>;
    readAt: string | null;
    createdAt: string;
  }[]
> {
  const r = await pool.query<NotificationRow>(
    `SELECT id, kind, payload, read_at, created_at
       FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 100)],
  );
  return r.rows.map((row) => ({
    id: Number(row.id),
    kind: row.kind as NotificationKind,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    readAt:
      row.read_at == null
        ? null
        : typeof row.read_at === "string"
          ? row.read_at
          : new Date(row.read_at).toISOString(),
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at).toISOString(),
  }));
}

export async function unreadNotificationCount(
  pool: Pool,
  userId: number,
): Promise<number> {
  const r = await pool.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM notifications
      WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return Number(r.rows[0]?.c ?? 0);
}

/**
 * Pass `ids = null` to mark every unread notification for the user as read.
 */
export async function markNotificationsRead(
  pool: Pool,
  userId: number,
  ids: number[] | null,
) {
  if (ids === null) {
    await pool.query(
      `UPDATE notifications SET read_at = NOW()
        WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
    return;
  }
  if (ids.length === 0) return;
  const phs = ids.map((_, i) => `$${i + 2}`).join(",");
  await pool.query(
    `UPDATE notifications SET read_at = NOW()
      WHERE user_id = $1 AND id IN (${phs}) AND read_at IS NULL`,
    [userId, ...ids],
  );
}
