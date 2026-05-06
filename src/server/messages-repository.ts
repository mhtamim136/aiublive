import type { Pool } from "pg";
import { emitToUser } from "./realtime";
import { createNotification } from "./notifications-repository";

export type MessageRow = {
  id: number;
  thread_id: number;
  sender_id: number;
  body: string;
  created_at: Date | string;
};

export type ThreadSummary = {
  threadId: number;
  peerId: number;
  lastMessageAt: string;
  lastMessage: { id: number; senderId: number; body: string } | null;
};

export type AppMessage = {
  id: number;
  threadId: number;
  senderId: number;
  body: string;
  createdAt: string;
};

const orderPair = (a: number, b: number): [number, number] =>
  a < b ? [a, b] : [b, a];

/**
 * Find an existing thread for the (a, b) pair, otherwise create one.
 * Always returns the canonical ordered-pair row.
 */
export async function findOrCreateThread(
  pool: Pool,
  userA: number,
  userB: number,
): Promise<{ id: number; userAId: number; userBId: number } | null> {
  if (userA === userB) return null;
  const [lo, hi] = orderPair(userA, userB);
  const sel = await pool.query<{ id: number; user_a_id: number; user_b_id: number }>(
    `SELECT id, user_a_id, user_b_id FROM message_threads
      WHERE user_a_id = $1 AND user_b_id = $2 LIMIT 1`,
    [lo, hi],
  );
  const found = sel.rows[0];
  if (found) {
    return { id: Number(found.id), userAId: lo, userBId: hi };
  }
  const ins = await pool.query<{ id: number }>(
    `INSERT INTO message_threads (user_a_id, user_b_id)
       VALUES ($1, $2)
       ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET user_a_id = EXCLUDED.user_a_id
       RETURNING id`,
    [lo, hi],
  );
  return { id: Number(ins.rows[0]?.id), userAId: lo, userBId: hi };
}

export async function listMyThreads(
  pool: Pool,
  userId: number,
  limit = 50,
): Promise<ThreadSummary[]> {
  // Fetch every thread the user participates in along with the latest
  // message in a single round trip via DISTINCT ON + LATERAL.
  const r = await pool.query<{
    thread_id: number;
    user_a_id: number;
    user_b_id: number;
    last_message_at: Date | string;
    last_id: number | null;
    last_sender_id: number | null;
    last_body: string | null;
  }>(
    `SELECT t.id AS thread_id,
            t.user_a_id, t.user_b_id, t.last_message_at,
            m.id  AS last_id,
            m.sender_id AS last_sender_id,
            m.body AS last_body
       FROM message_threads t
       LEFT JOIN LATERAL (
         SELECT id, sender_id, body
           FROM messages
          WHERE thread_id = t.id
          ORDER BY created_at DESC
          LIMIT 1
       ) m ON TRUE
      WHERE t.user_a_id = $1 OR t.user_b_id = $1
      ORDER BY t.last_message_at DESC
      LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 100)],
  );
  return r.rows.map((row) => {
    const peerId =
      Number(row.user_a_id) === userId
        ? Number(row.user_b_id)
        : Number(row.user_a_id);
    return {
      threadId: Number(row.thread_id),
      peerId,
      lastMessageAt:
        typeof row.last_message_at === "string"
          ? row.last_message_at
          : new Date(row.last_message_at).toISOString(),
      lastMessage:
        row.last_id == null
          ? null
          : {
              id: Number(row.last_id),
              senderId: Number(row.last_sender_id),
              body: String(row.last_body ?? ""),
            },
    };
  });
}

export async function listMessagesWithPeer(
  pool: Pool,
  userId: number,
  peerId: number,
  limit = 100,
): Promise<{ thread: { id: number } | null; messages: AppMessage[] }> {
  if (userId === peerId) return { thread: null, messages: [] };
  const [lo, hi] = orderPair(userId, peerId);
  const t = await pool.query<{ id: number }>(
    `SELECT id FROM message_threads
      WHERE user_a_id = $1 AND user_b_id = $2 LIMIT 1`,
    [lo, hi],
  );
  const threadId = t.rows[0]?.id ? Number(t.rows[0].id) : null;
  if (!threadId) return { thread: null, messages: [] };

  const m = await pool.query<MessageRow>(
    `SELECT id, thread_id, sender_id, body, created_at
       FROM messages
      WHERE thread_id = $1
      ORDER BY created_at ASC
      LIMIT $2`,
    [threadId, Math.min(Math.max(limit, 1), 500)],
  );
  return {
    thread: { id: threadId },
    messages: m.rows.map((r) => ({
      id: Number(r.id),
      threadId: Number(r.thread_id),
      senderId: Number(r.sender_id),
      body: String(r.body),
      createdAt:
        typeof r.created_at === "string"
          ? r.created_at
          : new Date(r.created_at).toISOString(),
    })),
  };
}

/**
 * Insert a message, bump the thread's last_message_at, fire a real-time
 * "message" event to the peer, AND persist a "message" notification for
 * them. Returns the canonical AppMessage so the sender can render it
 * without re-fetching.
 */
export async function sendMessage(
  pool: Pool,
  senderId: number,
  peerId: number,
  body: string,
): Promise<AppMessage | null> {
  const trimmed = body.trim().slice(0, 4000);
  if (!trimmed) return null;
  if (senderId === peerId) return null;

  const thread = await findOrCreateThread(pool, senderId, peerId);
  if (!thread) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query<MessageRow>(
      `INSERT INTO messages (thread_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, thread_id, sender_id, body, created_at`,
      [thread.id, senderId, trimmed],
    );
    await client.query(
      `UPDATE message_threads SET last_message_at = NOW() WHERE id = $1`,
      [thread.id],
    );
    await client.query("COMMIT");

    const row = ins.rows[0];
    const msg: AppMessage = {
      id: Number(row.id),
      threadId: Number(row.thread_id),
      senderId: Number(row.sender_id),
      body: String(row.body),
      createdAt:
        typeof row.created_at === "string"
          ? row.created_at
          : new Date(row.created_at).toISOString(),
    };

    // Live-push to the peer so their open chat updates instantly.
    emitToUser(peerId, {
      type: "message",
      data: {
        id: msg.id,
        threadId: msg.threadId,
        peerId: senderId,
        senderId: msg.senderId,
        body: msg.body,
        createdAt: msg.createdAt,
      },
    });

    // …and persist a "message" notification (fire-and-forget — failure here
    // shouldn't fail the send).
    void createNotification(pool, peerId, "message", {
      peerId: senderId,
      threadId: msg.threadId,
      preview: msg.body.slice(0, 140),
    }).catch((err) =>
      console.error("[messages] notification create failed:", err),
    );

    return msg;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
