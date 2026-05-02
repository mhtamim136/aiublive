"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Sparkles, UserCheck, UserPlus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/lib/store";
import { mockStudents } from "@/lib/mock-data";
import { matchReasons, matchScore, rankBy } from "@/lib/match";
import { StudentCard } from "@/components/app/student-card";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { Student } from "@/lib/types";

type TabKey = "connected" | "pending" | "saved" | "suggested";

export default function ConnectionsPage() {
  const me = useStore((s) => s.me);
  const connections = useStore((s) => s.connections);
  const acceptConnection = useStore((s) => s.acceptConnection);
  const bookmarks = useStore((s) => s.bookmarks);
  const [tab, setTab] = React.useState<TabKey>("connected");
  const [remote, setRemote] = React.useState<Record<string, Student>>({});

  const relatedIds = React.useMemo(() => {
    const ids = new Set<string>();
    bookmarks.forEach((b) => ids.add(b));
    Object.entries(connections).forEach(([sid, st]) => {
      if (st === "connected" || st === "pending") ids.add(sid);
    });
    return [...ids].filter((x) => /^[0-9]+$/.test(x));
  }, [bookmarks, connections]);

  React.useEffect(() => {
    if (!relatedIds.length) {
      setRemote({});
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/users/batch?ids=${encodeURIComponent(relatedIds.join(","))}`,
          { credentials: "include", cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (!alive || (data.ok as boolean) !== true) return;
        const map: Record<string, Student> = {};
        (data.students as Student[]).forEach((s) => {
          map[s.id] = s;
        });
        setRemote(map);
      } catch {
        if (alive) setRemote({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [relatedIds]);

  if (!me) return null;

  const resolve = (id: string) => remote[id] ?? mockStudents.find((s) => s.id === id);

  const connected = Object.keys(connections)
    .filter((id) => connections[id] === "connected")
    .map((id) => resolve(id))
    .filter(Boolean) as Student[];

  const pending = Object.keys(connections)
    .filter((id) => connections[id] === "pending")
    .map((id) => resolve(id))
    .filter(Boolean) as Student[];

  const saved = bookmarks
    .map((id) => resolve(id))
    .filter(Boolean) as Student[];
  const suggested = rankBy(mockStudents, (s) => matchScore(me, s))
    .filter(
      (r) => r.score > 0 && (connections[r.item.id] ?? "none") === "none",
    )
    .slice(0, 9)
    .map((r) => r.item);

  const tabs = [
    {
      value: "connected",
      label: `Connected (${connected.length})`,
      icon: <UserCheck className="h-3.5 w-3.5" />,
    },
    {
      value: "pending",
      label: `Pending (${pending.length})`,
      icon: <UserPlus className="h-3.5 w-3.5" />,
    },
    {
      value: "saved",
      label: `Saved (${saved.length})`,
      icon: <Bookmark className="h-3.5 w-3.5" />,
    },
    {
      value: "suggested",
      label: "Suggested",
      icon: <Sparkles className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your network"
        title={
          <>
            Connections that <span className="gradient-text">matter</span>.
          </>
        }
        description="Manage your campus network — friends, study partners, mentors, and saved profiles."
      />

      <Tabs
        tabs={tabs}
        value={tab}
        onChange={(v) => setTab(v as TabKey)}
        className="w-full overflow-x-auto"
      />

      {tab === "connected" &&
        (connected.length === 0 ? (
          <EmptyState
            icon={<Users2 className="h-5 w-5" />}
            title="You haven't accepted any connections yet"
            description="Once you accept connection requests, they'll appear here."
            action={
              <Link href="/discover">
                <Button>Discover students</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((s) => (
              <StudentCard key={s.id} student={s} />
            ))}
          </div>
        ))}

      {tab === "pending" &&
        (pending.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="h-5 w-5" />}
            title="No pending requests"
            description="You'll see the people you've requested here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  @{s.handle} · {s.department}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Request sent. (Demo: accept on their behalf.)
                </p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/profile/${s.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View profile
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => void acceptConnection(s.id)}
                    leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                  >
                    Mark accepted
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "saved" &&
        (saved.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-5 w-5" />}
            title="Nothing saved yet"
            description="Bookmark profiles to come back to them later."
            action={
              <Link href="/discover">
                <Button>Browse students</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((s) => (
              <StudentCard key={s.id} student={s} />
            ))}
          </div>
        ))}

      {tab === "suggested" &&
        (suggested.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="No suggestions right now"
            description="Add more skills and courses to unlock smarter matches."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggested.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                reasons={matchReasons(me, s)}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
