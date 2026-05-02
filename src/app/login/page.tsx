"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const me = useStore((s) => s.me);
  const router = useRouter();
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => setHydrated(true), []);
  React.useEffect(() => {
    if (hydrated && me) router.replace("/dashboard");
  }, [hydrated, me, router]);

  return (
    <AuthShell side={<LoginSidePanel />}>
      <LoginForm />
    </AuthShell>
  );
}

function LoginSidePanel() {
  return (
    <div>
      <h2 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
        Sign in to <span className="gradient-text">AIUB Live</span>
      </h2>
      <p className="mt-4 text-base text-muted-foreground">
        Pick up exactly where you left off — your matches, courses, projects,
        and connections are right where you left them.
      </p>

      <ul className="mt-10 space-y-4 text-sm">
        <li className="flex items-start gap-3">
          <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-medium text-foreground">Strong, modern auth</p>
            <p className="text-xs text-muted-foreground">
              PBKDF2-SHA256 with per-account salt, 200,000 iterations. Your
              password never leaves your device in plaintext.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent">
            <KeyRound className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-medium text-foreground">Brute-force protection</p>
            <p className="text-xs text-muted-foreground">
              Five wrong attempts and the account locks for 5 minutes — no
              endless guessing.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-success/10 text-success">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-medium text-foreground">No portal access</p>
            <p className="text-xs text-muted-foreground">
              We never connect to the AIUB portal. Your password here is set
              by you, for AIUB Live only.
            </p>
          </div>
        </li>
      </ul>
    </div>
  );
}
