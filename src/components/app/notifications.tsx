"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  CheckCheck,
  Layers,
  Lightbulb,
  Sparkles,
  Sparkles as SparkleAlt,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  buildNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { cn, formatRelativeTime } from "@/lib/utils";

const KIND_ICON: Record<AppNotification["kind"], React.ComponentType<{ className?: string }>> = {
  match: Sparkles,
  course: BookOpen,
  project: Layers,
  mentor: Lightbulb,
  system: SparkleAlt,
};

const KIND_TONE: Record<AppNotification["kind"], string> = {
  match: "bg-primary/10 text-primary",
  course: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  project: "bg-accent/10 text-accent",
  mentor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  system: "bg-muted text-muted-foreground",
};

export function NotificationsBell() {
  const me = useStore((s) => s.me);
  const readIds = useStore((s) => s.readNotifications);
  const markNotificationsRead = useStore((s) => s.markNotificationsRead);
  const markAllNotificationsRead = useStore(
    (s) => s.markAllNotificationsRead,
  );

  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const notifications = React.useMemo<AppNotification[]>(
    () => (me ? buildNotifications(me) : []),
    [me],
  );

  const unreadIds = React.useMemo(
    () =>
      notifications
        .filter((n) => !readIds.includes(n.id))
        .map((n) => n.id),
    [notifications, readIds],
  );

  // Close on outside click
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

  const allIds = notifications.map((n) => n.id);

  return (
    <div ref={wrapRef} className="relative">
      <button
        aria-label={`Notifications${unreadIds.length ? `, ${unreadIds.length} unread` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
          open && "border-primary/40 text-primary",
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadIds.length > 0 && (
          <span
            className="absolute -top-1 -right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow"
            aria-hidden
          >
            {unreadIds.length > 9 ? "9+" : unreadIds.length}
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
                {unreadIds.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {unreadIds.length} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadIds.length > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead(allIds)}
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
                  All caught up. Nothing new on campus right now.
                </p>
              ) : (
                <ul>
                  {notifications.map((n) => {
                    const isRead = readIds.includes(n.id);
                    const Icon = KIND_ICON[n.kind] ?? Sparkles;
                    return (
                      <li
                        key={n.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <Link
                          href={n.href}
                          onClick={() => {
                            markNotificationsRead([n.id]);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                            !isRead && "bg-primary/[0.04]",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                              KIND_TONE[n.kind],
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
                                {n.title}
                              </p>
                              {!isRead && (
                                <span
                                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                                  aria-label="Unread"
                                />
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.body}
                            </p>
                            <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {formatRelativeTime(n.at)}
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
                Calm by design — only useful pings. Tweak in{" "}
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
