"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatRelativeTime, resolveStudentAvatar } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import type { Student } from "@/lib/types";

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const me = useStore((s) => s.me);
  const threadSummaries = useStore((s) => s.threadSummaries);
  const threadMessages = useStore((s) => s.threadMessages);
  const connections = useStore((s) => s.connections);
  const sendMessage = useStore((s) => s.sendMessage);
  const loadThreads = useStore((s) => s.loadThreads);
  const loadMessagesWithPeer = useStore((s) => s.loadMessagesWithPeer);

  const params = useSearchParams();
  const router = useRouter();

  const queryTo = params.get("to");
  const connectedIds = React.useMemo(
    () =>
      Object.entries(connections)
        .filter(([, st]) => st === "connected")
        .map(([id]) => id)
        .filter((x) => /^[0-9]+$/.test(x)),
    [connections],
  );

  // Candidate ids = existing thread peers (DB) ∪ connected users.
  const candidateIds = React.useMemo(() => {
    const ids = new Set<string>();
    threadSummaries.forEach((t) => ids.add(String(t.peerId)));
    connectedIds.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [threadSummaries, connectedIds]);

  const [activeId, setActiveId] = React.useState<string | null>(
    queryTo ?? candidateIds[0] ?? null,
  );

  // Sync the URL → active id (one-way, when navigated to /messages?to=X).
  React.useEffect(() => {
    if (queryTo && queryTo !== activeId) setActiveId(queryTo);
  }, [queryTo, activeId]);

  // First load — pull thread list (also done by useRealtime, but harmless).
  React.useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  // Whenever the active thread changes, hydrate its messages from the API
  // (idempotent — re-fetching just refreshes the snapshot).
  React.useEffect(() => {
    if (activeId && /^[0-9]+$/.test(activeId)) {
      void loadMessagesWithPeer(activeId);
    }
  }, [activeId, loadMessagesWithPeer]);

  // Resolve peer student info via /api/users/batch (handle, name, avatar).
  const [students, setStudents] = React.useState<Record<string, Student>>({});
  React.useEffect(() => {
    if (candidateIds.length === 0) {
      setStudents({});
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/users/batch?ids=${encodeURIComponent(candidateIds.join(","))}`,
          { credentials: "include", cache: "no-store" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          students?: Student[];
        };
        if (!alive || data.ok !== true) return;
        const map: Record<string, Student> = {};
        (data.students ?? []).forEach((s) => {
          map[s.id] = s;
        });
        setStudents(map);
      } catch {
        if (alive) setStudents({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [candidateIds]);

  // Auto-scroll the chat view to bottom when messages change.
  const messagesRef = React.useRef<HTMLDivElement>(null);
  const activeMessages = activeId ? threadMessages[activeId] ?? [] : [];
  React.useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeMessages.length, activeId]);

  if (!me) return null;

  const activeStudent = activeId ? students[activeId] : null;
  const isConnected = activeId && connections[activeId] === "connected";

  // Order candidates by most-recent message (threadSummaries is already sorted).
  const orderedCandidates = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of threadSummaries) {
      const k = String(t.peerId);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    for (const c of connectedIds) {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messages"
        title="Focused conversations only"
        description="DMs are unlocked once you're connected. Live updates — no refresh needed."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside
          className={cn(
            "rounded-2xl border border-border bg-card p-2",
            activeStudent ? "hidden lg:block" : "block",
          )}
        >
          {orderedCandidates.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-5 w-5" />}
              title="Nothing here yet"
              description="Connect with someone first to start a conversation."
              action={
                <Link href="/discover">
                  <Button size="sm">Find students</Button>
                </Link>
              }
              className="border-none bg-transparent"
            />
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto p-1">
              {orderedCandidates.map((peerId) => {
                const s = students[peerId];
                if (!s) return null;
                const summary = threadSummaries.find(
                  (t) => String(t.peerId) === peerId,
                );
                const last = summary?.lastMessage ?? null;
                return (
                  <li key={peerId}>
                    <button
                      onClick={() => {
                        setActiveId(peerId);
                        router.replace(`/messages?to=${peerId}`, {
                          scroll: false,
                        });
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
                        activeId === peerId
                          ? "bg-foreground text-background"
                          : "hover:bg-muted/60",
                      )}
                    >
                      <Avatar
                        name={s.name}
                        src={resolveStudentAvatar(s)}
                        size={40}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {s.name}
                        </p>
                        <p
                          className={cn(
                            "truncate text-xs",
                            activeId === peerId
                              ? "text-background/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {last
                            ? `${last.senderId === Number(me.id) ? "You: " : ""}${last.body}`
                            : connections[peerId] === "connected"
                              ? "Say hi 👋"
                              : "Connect to message"}
                        </p>
                      </div>
                      {summary?.lastMessageAt && (
                        <span
                          className={cn(
                            "ml-2 shrink-0 text-[10px]",
                            activeId === peerId
                              ? "text-background/60"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatRelativeTime(summary.lastMessageAt)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section
          className={cn(
            "flex min-h-[60vh] flex-col rounded-2xl border border-border bg-card",
            !activeStudent && "hidden lg:flex",
          )}
        >
          {!activeStudent ? (
            <div className="grid h-full place-items-center p-10 text-center text-sm text-muted-foreground">
              Pick a conversation to get started.
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-border p-4">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  onClick={() => {
                    setActiveId(null);
                    router.replace("/messages", { scroll: false });
                  }}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar
                  name={activeStudent.name}
                  src={resolveStudentAvatar(activeStudent)}
                  size={36}
                  ring
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${activeStudent.id}`}
                    className="truncate text-sm font-semibold hover:text-primary"
                  >
                    {activeStudent.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {activeStudent.department} · {activeStudent.level}
                  </p>
                </div>
                {!isConnected && (
                  <Badge variant="warning">Locked — connect first</Badge>
                )}
              </header>

              <div
                ref={messagesRef}
                className="flex-1 space-y-3 overflow-y-auto p-4"
              >
                {activeMessages.length === 0 ? (
                  <p className="mx-auto mt-12 max-w-xs text-center text-sm text-muted-foreground">
                    {isConnected
                      ? "No messages yet. A short, kind hello goes a long way."
                      : "You'll be able to message after they accept your connection request."}
                  </p>
                ) : (
                  activeMessages.map((m) => {
                    const mine = m.senderId === Number(me.id);
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex",
                          mine ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          {m.body}
                          <span
                            className={cn(
                              "ml-2 text-[10px]",
                              mine
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatRelativeTime(m.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Composer
                disabled={!isConnected}
                onSend={async (text) => {
                  if (!activeId) return;
                  await sendMessage(activeId, text);
                }}
                placeholder={
                  isConnected
                    ? "Write a message…"
                    : "Connect first to message"
                }
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Composer({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const submit = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setText(""); // clear immediately for snappy UX
    setBusy(true);
    try {
      await onSend(v);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-2 border-t border-border p-3">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled || busy}
        className="flex-1"
      />
      <Button
        onClick={() => void submit()}
        disabled={disabled || busy || !text.trim()}
        leftIcon={<Send className="h-4 w-4" />}
      >
        Send
      </Button>
    </div>
  );
}
