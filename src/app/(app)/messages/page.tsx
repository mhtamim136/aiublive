"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { mockStudents } from "@/lib/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { avatarUrl, cn, formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const me = useStore((s) => s.me);
  const threads = useStore((s) => s.threads);
  const connections = useStore((s) => s.connections);
  const sendMessage = useStore((s) => s.sendMessage);
  const params = useSearchParams();
  const router = useRouter();

  const queryTo = params.get("to");
  const threadIds = Object.keys(threads);
  const connectedIds = Object.entries(connections)
    .filter(([, st]) => st === "connected")
    .map(([id]) => id);

  // The full list of conversation candidates: existing threads + connected
  const candidateIds = Array.from(new Set([...threadIds, ...connectedIds]));
  const [activeId, setActiveId] = React.useState<string | null>(
    queryTo ?? candidateIds[0] ?? null,
  );

  React.useEffect(() => {
    if (queryTo && queryTo !== activeId) setActiveId(queryTo);
  }, [queryTo, activeId]);

  if (!me) return null;

  const activeStudent = activeId
    ? mockStudents.find((s) => s.id === activeId)
    : null;
  const activeThread = activeId ? threads[activeId] ?? [] : [];
  const isConnected = activeId && connections[activeId] === "connected";

  const sortedCandidates = candidateIds
    .map((id) => mockStudents.find((s) => s.id === id))
    .filter(Boolean) as typeof mockStudents;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messages"
        title="Focused conversations only"
        description="DMs are unlocked once you're connected. Conversations stay in context, not in chaos."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Threads list */}
        <aside
          className={cn(
            "rounded-2xl border border-border bg-card p-2",
            activeStudent ? "hidden lg:block" : "block",
          )}
        >
          {sortedCandidates.length === 0 ? (
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
              {sortedCandidates.map((s) => {
                const thread = threads[s.id] ?? [];
                const last = thread[thread.length - 1];
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setActiveId(s.id);
                        router.replace(`/messages?to=${s.id}`, {
                          scroll: false,
                        });
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
                        activeId === s.id
                          ? "bg-foreground text-background"
                          : "hover:bg-muted/60",
                      )}
                    >
                      <Avatar
                        name={s.name}
                        src={avatarUrl(s.handle)}
                        size={40}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {s.name}
                        </p>
                        <p
                          className={cn(
                            "truncate text-xs",
                            activeId === s.id
                              ? "text-background/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {last
                            ? `${last.fromId === me.id ? "You: " : ""}${last.text}`
                            : connections[s.id] === "connected"
                              ? "Say hi 👋"
                              : "Connect to message"}
                        </p>
                      </div>
                      {last && (
                        <span
                          className={cn(
                            "ml-2 shrink-0 text-[10px]",
                            activeId === s.id
                              ? "text-background/60"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatRelativeTime(last.at)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Active thread */}
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
                  src={avatarUrl(activeStudent.handle)}
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

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {activeThread.length === 0 ? (
                  <p className="mx-auto mt-12 max-w-xs text-center text-sm text-muted-foreground">
                    {isConnected
                      ? "No messages yet. A short, kind hello goes a long way."
                      : "You'll be able to message after they accept your connection request."}
                  </p>
                ) : (
                  activeThread.map((m) => {
                    const mine = m.fromId === me.id;
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
                          {m.text}
                          <span
                            className={cn(
                              "ml-2 text-[10px]",
                              mine
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatRelativeTime(m.at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Composer
                disabled={!isConnected}
                onSend={(text) => {
                  if (!activeId) return;
                  sendMessage(activeId, text);
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
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = React.useState("");
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText("");
  };
  return (
    <div className="flex items-center gap-2 border-t border-border p-3">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Button
        onClick={submit}
        disabled={disabled || !text.trim()}
        leftIcon={<Send className="h-4 w-4" />}
      >
        Send
      </Button>
    </div>
  );
}
