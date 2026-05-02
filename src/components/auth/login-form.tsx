"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, IdCard, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";

const STUDENT_ID_REGEX = /^\d{2}-\d{5}-\d$/;

function formatStudentId(raw: string) {
  // Allow user to type with or without hyphens; normalise to 22-12345-1.
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  if (digits.length > 0) out += digits.slice(0, 2);
  if (digits.length > 2) out += "-" + digits.slice(2, 7);
  if (digits.length > 7) out += "-" + digits.slice(7, 8);
  return out;
}

function formatLockoutCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const presetId = params.get("id") ?? "";

  const signIn = useStore((s) => s.signIn);
  const { toast } = useToast();

  const [studentId, setStudentId] = React.useState(presetId);
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<{
    studentId?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = React.useState<number | null>(
    null,
  );
  const [lockedUntil, setLockedUntil] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(Date.now());

  // Countdown ticker for lockout
  React.useEffect(() => {
    if (!lockedUntil) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const isLocked = !!(lockedUntil && lockedUntil > now);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isLocked) return;

    const nextErrors: typeof errors = {};
    if (!STUDENT_ID_REGEX.test(studentId))
      nextErrors.studentId = "Format: 22-12345-1";
    if (password.length < 1) nextErrors.password = "Enter your password";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    setRemainingAttempts(null);

    try {
      const result = await signIn(studentId, password);
      if (result.ok) {
        toast({
          kind: "success",
          title: `Welcome back, ${result.name.split(" ")[0]}`,
        });
        router.replace(next);
        return;
      }
      // Failure
      setServerError(result.message);
      if (result.code === "wrong-password" && "remainingAttempts" in result) {
        setRemainingAttempts(result.remainingAttempts ?? null);
      }
      if (result.code === "locked" && result.lockedUntil) {
        setLockedUntil(result.lockedUntil);
      }
      // Clear password to slow down enumeration
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  const remainingMs = lockedUntil ? lockedUntil - now : 0;

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Sign in
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
          Welcome back to AIUB Live
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Use your AIUB student ID and the password you set up here.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="studentId">AIUB student ID</Label>
          <Input
            id="studentId"
            inputMode="numeric"
            placeholder="22-12345-1"
            value={studentId}
            onChange={(e) => {
              setStudentId(formatStudentId(e.target.value));
              setErrors((p) => ({ ...p, studentId: undefined }));
            }}
            error={errors.studentId}
            leftIcon={<IdCard className="h-4 w-4" />}
            autoFocus={!presetId}
            disabled={submitting || isLocked}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <PasswordInput
            id="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((p) => ({ ...p, password: undefined }));
            }}
            error={errors.password}
            disabled={submitting || isLocked}
            autoComplete="current-password"
            autoFocus={!!presetId}
          />
        </div>

        {(serverError || isLocked) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{serverError ?? "Account locked"}</p>
              {isLocked ? (
                <p className="mt-0.5 text-xs">
                  Try again in{" "}
                  <span className="font-mono tabular-nums">
                    {formatLockoutCountdown(remainingMs)}
                  </span>
                  .
                </p>
              ) : (
                remainingAttempts !== null &&
                remainingAttempts <= 3 && (
                  <p className="mt-0.5 text-xs">
                    {remainingAttempts} attempt
                    {remainingAttempts === 1 ? "" : "s"} left before this
                    account is temporarily locked.
                  </p>
                )
              )}
            </div>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={submitting}
          disabled={isLocked}
          rightIcon={!submitting && <ArrowRight className="h-4 w-4" />}
        >
          {isLocked ? "Locked — wait a moment" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link
          href="/onboarding"
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
        <span className="text-muted-foreground">
          <Lock className="-mt-0.5 mr-1 inline h-3 w-3" />
          Secured with bcrypt + JWT (HttpOnly cookie)
        </span>
      </div>
    </div>
  );
}
