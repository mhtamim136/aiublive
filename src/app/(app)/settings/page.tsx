"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Eye,
  KeyRound,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { cn, formatRelativeTime } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const me = useStore((s) => s.me);
  const signedInId = useStore((s) => s.signedInId);
  const signOut = useStore((s) => s.signOut);
  const reset = useStore((s) => s.reset);
  const { toast } = useToast();

  const [showCourses, setShowCourses] = React.useState(true);
  const [showAchievements, setShowAchievements] = React.useState(true);
  const [showProjects, setShowProjects] = React.useState(true);
  const [smartMatch, setSmartMatch] = React.useState(true);
  const [emailDigest, setEmailDigest] = React.useState(false);

  const [pwOpen, setPwOpen] = React.useState(false);

  if (!me) return null;

  const handleSignOut = async () => {
    await signOut();
    toast({
      kind: "info",
      title: "Signed out",
      description: "Sign back in any time with your AIUB student ID.",
    });
    router.replace("/login");
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Permanently delete your AIUB Live account and profile in the database? This cannot be undone.",
      )
    )
      return;
    const pwd = window.prompt(
      "Type your current password to confirm account deletion:",
    );
    if (!pwd) return;

    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: signedInId,
          password: pwd,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) {
        toast({
          kind: "error",
          title: "Could not delete account",
          description: String(data.message || res.statusText),
        });
        return;
      }

      reset();
      toast({ kind: "success", title: "Account deleted" });
      setTimeout(() => router.replace("/"), 200);
    } catch {
      toast({
        kind: "error",
        title: "Network error",
        description: "Try again shortly.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Make AIUB Live yours."
        description="Privacy, security, notifications and theme — set it and forget it."
      />

      <Section
        title="Security"
        icon={<ShieldCheck className="h-4 w-4" />}
        description="AIUB Live is independent. We never connect to the AIUB portal."
      >
        <div className="grid grid-cols-1 gap-3">
          <Row
            title="Password"
            description={
              <>
                Stored with bcrypt hashing on the database and guarded by JWT
                session cookies from the backend. Repeated failures lock login
                for a cooldown period.
              </>
            }
            action={
              <Button
                variant="outline"
                size="sm"
                leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                onClick={() => setPwOpen(true)}
              >
                Change password
              </Button>
            }
          />
          <Row
            title="Active session"
            description={
              <>
                Signed in as{" "}
                <span className="font-mono">
                  {signedInId ?? me.studentIdMasked}
                </span>
                . Joined {formatRelativeTime(me.joinedAt)}.
              </>
            }
            action={
              <Button
                variant="outline"
                size="sm"
                leftIcon={<LogOut className="h-3.5 w-3.5" />}
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            }
          />
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">No portal access</p>
              <p className="mt-1">
                We never request, store, or transmit any AIUB portal
                credentials. Your full student ID is masked publicly:{" "}
                <span className="font-mono">{me.studentIdMasked}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <Badge variant="success" className="mt-0.5">
              Data
            </Badge>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Your data lives in your browser
              </p>
              <p className="mt-1">
                Your hashed password and profile snapshot are stored in this
                device's localStorage. They never leave the browser.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Privacy"
        icon={<Eye className="h-4 w-4" />}
        description="What other AIUB students see on your profile."
      >
        <Toggle
          label="Show my current courses"
          description="Coursemates can find you through shared courses."
          value={showCourses}
          onChange={setShowCourses}
        />
        <Toggle
          label="Show my achievements"
          description="Wins, awards, and dean's list."
          value={showAchievements}
          onChange={setShowAchievements}
        />
        <Toggle
          label="Show my projects"
          description="Side projects, capstones, and hackathon builds."
          value={showProjects}
          onChange={setShowProjects}
        />
      </Section>

      <Section
        title="Notifications"
        icon={<Bell className="h-4 w-4" />}
        description="We keep things calm — only useful pings."
      >
        <Toggle
          label="Daily smart match"
          description="3 thoughtful matches each day, surfaced on your dashboard."
          value={smartMatch}
          onChange={setSmartMatch}
        />
        <Toggle
          label="Email digest (weekly)"
          description="A short Sunday recap of campus moves."
          value={emailDigest}
          onChange={setEmailDigest}
        />
      </Section>

      <Section
        title="Appearance"
        icon={<Sparkles className="h-4 w-4" />}
        description="Light or dark — your eyes, your call."
      >
        <div className="flex items-center justify-between">
          <p className="text-sm">Theme</p>
          <ThemeToggle />
        </div>
      </Section>

      <Section
        title="Danger zone"
        icon={<RefreshCw className="h-4 w-4" />}
        description="These actions cannot be undone. Be careful."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium">Delete account</p>
            <p className="text-muted-foreground">
              Permanently removes your profile and credentials from this
              device.
            </p>
          </div>
          <Button
            variant="destructive"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={handleDelete}
          >
            Delete account
          </Button>
        </div>
      </Section>

      <p className="text-center text-xs text-muted-foreground">
        Need help?{" "}
        <Link href="/" className="font-medium text-primary hover:underline">
          Visit the home page
        </Link>
      </p>

      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        description="Pick something fresh — and not used anywhere else."
        size="md"
      >
        <ChangePasswordForm onClose={() => setPwOpen(false)} />
      </Modal>
    </div>
  );
}

function Section({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Row({
  title,
  description,
  action,
}: {
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:bg-muted/40"
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <span
        className={cn(
          "mt-0.5 inline-block h-5 w-9 shrink-0 rounded-full transition-colors",
          value ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 translate-y-[2px] rounded-full bg-background transition-transform",
            value ? "translate-x-[20px]" : "translate-x-[2px]",
          )}
        />
      </span>
    </button>
  );
}
