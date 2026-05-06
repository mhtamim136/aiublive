"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Sparkles,
  UserCheck,
  UserPlus,
  Users2,
  X,
} from "lucide-react";
import { useStore, type AppNotification } from "@/lib/store";
import { cn, formatRelativeTime } from "@/lib/utils";

const KIND_ICON: Record<
  AppNotification["kind"],
  React.ComponentType<{ className?: string }>
> = {
  "connection-request": UserPlus,
  "connection-accepted": UserCheck,
  message: MessageSquare,
  "team-activity": Users2,
};

const KIND_TONE: Record<AppNotification["kind"], string> = {
  "connection-request": "bg-primary/10 text-primary",
  "connection-accepted": "bg-success/10 text-success",
  message: "bg-accent/10 text-accent",
  "team-activity": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function titleFor(n: AppNotification): string {
  const peerName = String(n.payload?.peerName ?? "Someone");
  switch (n.kind) {
    case "connection-request":
      return `${peerName} wants to connect`;
    case "connection-accepted":
      return `${peerName} accepted your request`;
    case "message":
      return `New message`;
    case "team-activity":
      return "Team activity";
    default:
      return "Notification";
  }
}

function bodyFor(n: AppNotification): string {
  switch (n.kind) {
    case "connection-request":
    case "connection-accepted": {
      const handle = n.payload?.peerHandle
        ? `@${String(n.payload.peerHandle)}`
        : "";
      return handle;
    }
    case "message":
      return String(n.payload?.preview ?? "");
    case "team-activity":
      return String(n.payload?.summary ?? "");
    default:
      return "";
  }
}

function hrefFor(n: AppNotification): string {
  switch (n.kind) {
    case "connection-request":
      return "/connections";
    case "connection-accepted":
      return n.payload?.peerId
        ? `/profile/${n.payload.peerId}`
        : "/connections";
    case "message":
      return n.payload?.peerId
        ? `/messages?to=${n.payload.peerId}`
        : "/messages";
    default:
      return "/dashboard";
  }
}

export function NotificationsBell() {
  const notifications = useStore((s) => s.notifications);
  const unread = useStore((s) => s.unreadCount);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);

  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
          open && "border-primary/40 text-primary",
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-full z-40 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            role="dialog"
            aria-label="Notifications"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unread > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={() => void markAllRead()}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>

            <div className="max-h-[28rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  All caught up. We'll ping you the moment something happens.
                </p>
              ) : (
                <ul>
                  {notifications.map((n) => {
                    const isRead = !!n.readAt;
                    const Icon = KIND_ICON[n.kind] ?? Sparkles;
                    return (
                      <li
                        key={n.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <Link
                          href={hrefFor(n)}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                            !isRead && "bg-primary/[0.04]",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                              KIND_TONE[n.kind] ?? "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "truncate text-sm",
                                  isRead ? "font-medium" : "font-semibold",
                                )}
                              >
                                {titleFor(n)}
                              </p>
                              {!isRead && (
                                <span
                                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                                  aria-label="Unread"
                                />
                              )}
                            </div>
                            {bodyFor(n) && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {bodyFor(n)}
                              </p>
                            )}
                            <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="border-t border-border bg-muted/20 px-4 py-2.5">
              <p className="text-center text-[11px] text-muted-foreground">
                Real-time pings — no refresh needed. Tweak in{" "}
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="font-medium text-foreground hover:text-primary"
                >
                  Settings
                </Link>
                .
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
