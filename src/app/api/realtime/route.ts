import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import {
  subscribeBroadcast,
  subscribeUser,
  type RealtimeEvent,
} from "@/server/realtime";

// Server-Sent Events (SSE) endpoint. Each open EventSource connection on the
// frontend lives here and receives `notification`, `message`, and
// `connection-update` events for the authenticated user.
//
// Browser-side EventSource auto-reconnects when the stream ends — that takes
// care of Vercel's serverless function timeout and Neon's compute auto-
// suspends. The DB still has the canonical rows so missed events are
// surfaced on the next list-fetch.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = getSessionUserIdFromCookies();
  if (uid == null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event.type}\n` +
                `data: ${JSON.stringify(event.data)}\n\n`,
            ),
          );
        } catch {
          // Already closed; nothing to do.
        }
      };

      // Initial "ready" event so the client knows the channel is open.
      send({ type: "ping", data: { ts: Date.now() } });

      const unsubUser = subscribeUser(uid, send);
      const unsubBroadcast = subscribeBroadcast(send);

      // Heartbeat every 25 s — keeps proxies/CDNs from closing the socket
      // and gives the client a quick way to tell the connection is alive.
      const heartbeat = setInterval(() => {
        send({ type: "ping", data: { ts: Date.now() } });
      }, 25_000);

      // The stream cancel handler runs when the client disconnects (tab
      // close, navigation away, browser-side reconnect, etc.).
      const cleanup = () => {
        clearInterval(heartbeat);
        unsubUser();
        unsubBroadcast();
        try {
          controller.close();
        } catch {
          //
        }
      };

      // Hook cleanup into stream cancellation.
      // @ts-expect-error — controller has no public hook; we expose ours via cancel().
      controller._cleanup = cleanup;
    },
    cancel() {
      // ReadableStream calls cancel() on disconnect; the start() closure stashed
      // a cleanup function on the controller for us to invoke here.
      const c = (this as unknown as { _cleanup?: () => void })._cleanup;
      c?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
