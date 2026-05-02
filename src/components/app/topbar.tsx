"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useStore } from "@/lib/store";
import { avatarUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { NotificationsBell } from "@/components/app/notifications";

export function Topbar() {
  const me = useStore((s) => s.me);
  const router = useRouter();
  const [q, setQ] = React.useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/discover?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Link href="/" className="md:hidden" aria-label="AIUB Live">
          <Logo showText={false} />
        </Link>

        <form onSubmit={onSubmit} className="flex-1 max-w-xl">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students, courses, skills…"
            leftIcon={<Search className="h-4 w-4" />}
            className="h-10 rounded-xl bg-card"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationsBell />
          <Link
            href="/profile/me"
            className="ml-1 inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition hover:bg-muted/60"
          >
            <Avatar
              name={me?.name ?? "You"}
              src={me ? avatarUrl(me.handle) : undefined}
              size={32}
            />
            <span className="hidden text-sm font-medium md:block">
              {me?.name?.split(" ")[0] ?? "You"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
