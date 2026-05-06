"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useStore } from "@/lib/store";
import { cn, resolveStudentAvatar } from "@/lib/utils";
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
      <div className="flex h-16 items-center gap-2 px-3 md:gap-3 md:px-6">
        <Link href="/" className="md:hidden" aria-label="AIUB Live">
          <Logo showText={false} />
        </Link>

        <form onSubmit={onSubmit} className="min-w-0 flex-1 max-w-xl">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students, courses, skills…"
            leftIcon={<Search className="h-4 w-4" />}
            className="h-10 rounded-xl bg-card"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Theme toggle is also in the profile menu — hidden on mobile to keep the bar tidy. */}
          <ThemeToggle className="hidden md:inline-flex" />
          <NotificationsBell />
          <MessagesIconButton />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

/** Quick-access pill that always points at /messages. */
function MessagesIconButton() {
  const pathname = usePathname();
  const active = pathname?.startsWith("/messages");
  return (
    <Link
      href="/messages"
      aria-label="Messages"
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
        active && "border-primary/40 text-primary",
      )}
    >
      <MessageSquare className="h-4 w-4" />
    </Link>
  );
}

function ProfileMenu() {
  const me = useStore((s) => s.me);
  const signOut = useStore((s) => s.signOut);
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

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

  const isDark = mounted ? (resolvedTheme ?? theme) === "dark" : false;

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace("/login");
  };

  const close = () => setOpen(false);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-card pr-2 pl-1 py-1 transition hover:bg-muted/60",
          open && "border-primary/40",
        )}
      >
        <Avatar
          name={me?.name ?? "You"}
          src={me ? resolveStudentAvatar(me) : undefined}
          size={28}
        />
        <span className="hidden text-sm font-medium md:block">
          {me?.name?.split(" ")[0] ?? "You"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        >
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-3">
              <Avatar
                name={me?.name ?? "You"}
                src={me ? resolveStudentAvatar(me) : undefined}
                size={36}
                ring
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {me?.name ?? "You"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {me?.handle ? `@${me.handle}` : "Signed in"}
                </p>
              </div>
            </div>
          </div>

          <ul className="p-1">
            <MenuItem
              href="/profile/me"
              icon={<UserIcon className="h-4 w-4" />}
              label="Profile"
              onSelect={close}
            />
            <MenuItem
              href="/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              onSelect={close}
            />
            <li>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={isDark}
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/60"
              >
                <span className="flex items-center gap-2">
                  {isDark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {isDark ? "Light mode" : "Dark mode"}
                </span>
                <span
                  className={cn(
                    "h-4 w-7 rounded-full transition-colors",
                    isDark ? "bg-primary" : "bg-muted",
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "block h-3.5 w-3.5 translate-y-[1px] rounded-full bg-background transition-transform",
                      isDark ? "translate-x-[14px]" : "translate-x-[2px]",
                    )}
                  />
                </span>
              </button>
            </li>
          </ul>

          <div className="border-t border-border p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onSelect,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onSelect?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        role="menuitem"
        onClick={onSelect}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/60"
      >
        {icon}
        {label}
      </Link>
    </li>
  );
}
