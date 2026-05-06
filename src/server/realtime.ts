// Live event fan-out, in-process. Each authenticated SSE connection
// subscribes to its own user-id channel. When the API performs a write
// (e.g. someone sends a connection request) it calls `emitToUser(uid, …)`
// and every open SSE stream for that user receives the event.
//
// Within a single Node/Vercel function instance this is enough for instant
// delivery. Across multiple instances the *DB* still has the canonical
// notification/message rows, so users on a different instance see them on
// the next reconnect (EventSource auto-reconnects within a few seconds).
//
// Runs once per Node process — pinned to globalThis so Next.js HMR in dev
// doesn't accumulate listeners across reloads.

import { EventEmitter } from "node:events";

export type RealtimeEvent =
  | {
      type: "notification";
      data: {
        id: number;
        kind: string;
        payload: Record<string, unknown>;
        createdAt: string;
      };
    }
  | {
      type: "message";
      data: {
        id: number;
        threadId: number;
        peerId: number;
        senderId: number;
        body: string;
        createdAt: string;
      };
    }
  | {
      type: "connection-update";
      data: { peerId: number; status: "pending" | "connected" };
    }
  | {
      type: "campus-changed";
      data: { kind: "signup" | "profile"; ts: number };
    }
  | {
      type: "ping";
      data: { ts: number };
    };

const globalForRealtime = globalThis as unknown as {
  __realtimeBus?: EventEmitter;
};

function bus(): EventEmitter {
  if (!globalForRealtime.__realtimeBus) {
    const e = new EventEmitter();
    // SSE means many concurrent listeners are fine and expected; raise the
    // ceiling so Node doesn't print MaxListeners warnings under normal load.
    e.setMaxListeners(0);
    globalForRealtime.__realtimeBus = e;
  }
  return globalForRealtime.__realtimeBus;
}

const channel = (userId: number) => `u:${userId}`;
const BROADCAST_CHANNEL = "broadcast";

export function emitToUser(userId: number, event: RealtimeEvent) {
  bus().emit(channel(userId), event);
}

/**
 * Fan an event out to every connected user on this Node instance. Use for
 * campus-wide signals (new signup, moderation events, etc.) where the
 * dashboard / discover counts may have changed for everyone.
 */
export function emitBroadcast(event: RealtimeEvent) {
  bus().emit(BROADCAST_CHANNEL, event);
}

export function subscribeUser(
  userId: number,
  handler: (event: RealtimeEvent) => void,
): () => void {
  const ch = channel(userId);
  bus().on(ch, handler);
  return () => bus().off(ch, handler);
}

export function subscribeBroadcast(
  handler: (event: RealtimeEvent) => void,
): () => void {
  bus().on(BROADCAST_CHANNEL, handler);
  return () => bus().off(BROADCAST_CHANNEL, handler);
}
