"use client";

import * as React from "react";
import { useStore, type AppMessage, type AppNotification } from "@/lib/store";
import { useToast } from "@/components/ui/toast";

function previewForNotification(n: AppNotification): {
  title: string;
  body: string;
} {
  const peerName = String(n.payload?.peerName ?? "Someone");
  const peerHandle = n.payload?.peerHandle
    ? `@${String(n.payload.peerHandle)}`
    : "";
  switch (n.kind) {
    case "connection-request":
      return {
        title: `${peerName} wants to connect`,
        body: peerHandle || "Tap to review the request.",
      };
    case "connection-accepted":
      return {
        title: `${peerName} accepted your request`,
        body: peerHandle || "You can message them now.",
      };
    case "message":
      return {
        title: `New message`,
        body: String(n.payload?.preview ?? "You have a new message."),
      };
    case "team-activity":
      return {
        title: "Team activity",
        body: String(n.payload?.summary ?? "Check your project teams."),
      };
    default:
      return { title: "Notification", body: "" };
  }
}

/**
 * Hook that opens an SSE connection to `/api/realtime` while the user is
 * signed in, forwards each event into the store, and tears down when the
 * user signs out / navigates away.
 *
 * EventSource auto-reconnects on its own, so we don't need a manual retry
 * loop here. On reconnect we pull the latest notifications/threads in case
 * any events were emitted on a different Vercel instance while we were
 * disconnected.
 */
export function useRealtime() {
  const me = useStore((s) => s.me);
  const sessionChecked = useStore((s) => s.sessionChecked);
  const pushIncomingNotification = useStore(
    (s) => s.pushIncomingNotification,
  );
  const pushIncomingMessage = useStore((s) => s.pushIncomingMessage);
  const applyConnectionUpdate = useStore((s) => s.applyConnectionUpdate);
  const setRealtimeConnected = useStore((s) => s.setRealtimeConnected);
  const loadNotifications = useStore((s) => s.loadNotifications);
  const loadThreads = useStore((s) => s.loadThreads);
  const bumpCampusTick = useStore((s) => s.bumpCampusTick);

  const { toast } = useToast();

  // Stable toast ref so EventSource handlers don't capture a stale closure.
  const toastRef = React.useRef(toast);
  React.useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  React.useEffect(() => {
    if (!sessionChecked || !me) return;

    // Initial pulls — gives the bell + thread list real data right away.
    loadNotifications();
    loadThreads();

    let es: EventSource | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource("/api/realtime", { withCredentials: true });

      es.addEventListener("open", () => {
        setRealtimeConnected(true);
      });

      es.addEventListener("error", () => {
        setRealtimeConnected(false);
        // Browser will auto-reconnect; refresh the lists when it does so the
        // user sees anything that happened while disconnected.
        if (es?.readyState === EventSource.CLOSED && !cancelled) {
          loadNotifications();
          loadThreads();
        }
      });

      es.addEventListener("notification", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as {
            id: number;
            kind: string;
            payload: Record<string, unknown>;
            createdAt: string;
          };
          const n: AppNotification = {
            id: data.id,
            kind: data.kind as AppNotification["kind"],
            payload: data.payload ?? {},
            readAt: null,
            createdAt: data.createdAt,
          };
          pushIncomingNotification(n);
          // Show a non-intrusive toast for the live event.
          const preview = previewForNotification(n);
          toastRef.current({
            kind: "info",
            title: preview.title,
            description: preview.body,
          });
        } catch {
          //
        }
      });

      es.addEventListener("message", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as {
            id: number;
            threadId: number;
            peerId: number;
            senderId: number;
            body: string;
            createdAt: string;
          };
          const m: AppMessage & { peerId: number } = {
            id: data.id,
            threadId: data.threadId,
            senderId: data.senderId,
            body: data.body,
            createdAt: data.createdAt,
            peerId: data.peerId,
          };
          pushIncomingMessage(m);
        } catch {
          //
        }
      });

      es.addEventListener("connection-update", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as {
            peerId: number;
            status: "pending" | "connected";
          };
          applyConnectionUpdate(data.peerId, data.status);
        } catch {
          //
        }
      });

      es.addEventListener("campus-changed", () => {
        // Campus-wide signal (e.g. someone signed up). Components subscribing
        // to `campusTick` re-fetch their data.
        bumpCampusTick();
      });
    };

    connect();

    return () => {
      cancelled = true;
      setRealtimeConnected(false);
      es?.close();
    };
  }, [
    me,
    sessionChecked,
    pushIncomingNotification,
    pushIncomingMessage,
    applyConnectionUpdate,
    setRealtimeConnected,
    loadNotifications,
    loadThreads,
    bumpCampusTick,
  ]);
}
