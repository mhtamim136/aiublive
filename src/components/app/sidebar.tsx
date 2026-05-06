"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  BookOpen,
  Layers,
  Users2,
  MessageSquare,
  User,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/coursemates", label: "Coursemates", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: Layers },
  { href: "/connections", label: "Connections", icon: Users2 },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

const secondary = [
  { href: "/profile/me", label: "My profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-xl md:sticky md:top-0 md:flex">
      <div className="flex h-16 items-center px-5">
        <Link
          href="/dashboard"
          aria-label="AIUB Live dashboard"
          className="rounded-lg p-1 -m-1 transition hover:opacity-80"
        >
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Browse
        </p>
        <ul className="space-y-0.5">
          {items.map((it) => {
            const active =
              pathname === it.href ||
              (it.href !== "/dashboard" && pathname.startsWith(it.href));
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="px-3 pb-1 pt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          You
        </p>
        <ul className="space-y-0.5">
          {secondary.map((it) => {
            const active = pathname.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SidebarUserCard />
    </aside>
  );
}

function SidebarUserCard() {
  return (
    <div className="border-t border-border p-3">
      <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">AIUB Live</p>
        <p className="mt-1">
          Independent campus product. Not affiliated with the university.
        </p>
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const mobileItems = items.slice(0, 5);
  return (
    <nav
      // pb-[env(safe-area-inset-bottom)] keeps the bar above iPhone home
      // indicators; min-h ensures every tap target is ≥44 px.
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      {mobileItems.map((it) => {
        const active =
          pathname === it.href ||
          (it.href !== "/dashboard" && pathname.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {/* Active pill — visible but subtle */}
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-3 top-1 h-0.5 rounded-full bg-primary"
              />
            )}
            <it.icon className="h-5 w-5" />
            <span className="tracking-tight">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
