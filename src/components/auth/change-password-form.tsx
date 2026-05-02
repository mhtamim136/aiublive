"use client";

import * as React from "react";
import { CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength";
import { useStore } from "@/lib/store";
import { changePassword } from "@/lib/accounts";
import { evaluatePassword } from "@/lib/crypto";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm({ onClose }: { onClose?: () => void }) {
  const me = useStore((s) => s.me);
  const signedInId = useStore((s) => s.signedInId);
  const { toast } = useToast();

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const report = React.useMemo(
    () =>
      evaluatePassword(next, {
        name: me?.name,
        handle: me?.handle,
        studentId: signedInId ?? undefined,
      }),
    [next, me?.name, me?.handle, signedInId],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedInId) return;

    const e0: typeof errors = {};
    if (current.length === 0) e0.current = "Required";
    if (!report.passed) e0.next = "Password doesn't meet the requirements yet.";
    if (confirm !== next) e0.confirm = "Passwords don't match.";
    setErrors(e0);
    if (Object.keys(e0).length) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const result = await changePassword(signedInId, current, next);
      if (!result.ok) {
        if (result.code === "wrong-current") setErrors({ current: result.message });
        else if (result.code === "weak-new") setErrors({ next: result.message });
        else if (result.code === "same-as-current")
          setErrors({ next: result.message });
        else setServerError(result.message);
        return;
      }
      toast({
        kind: "success",
        title: "Password updated",
        description: "Use the new password next time you sign in.",
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="cur">Current password</Label>
        <PasswordInput
          id="cur"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setErrors((p) => ({ ...p, current: undefined as unknown as string }));
          }}
          error={errors.current}
          autoComplete="current-password"
          autoFocus
        />
      </div>
      <div>
        <Label htmlFor="next">New password</Label>
        <PasswordInput
          id="next"
          value={next}
          onChange={(e) => {
            setNext(e.target.value);
            setErrors((p) => ({ ...p, next: undefined as unknown as string }));
          }}
          error={errors.next}
          autoComplete="new-password"
        />
        <div className="mt-3">
          <PasswordStrengthMeter report={report} />
        </div>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <PasswordInput
          id="confirm"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setErrors((p) => ({ ...p, confirm: undefined as unknown as string }));
          }}
          error={errors.confirm}
          autoComplete="new-password"
        />
        {confirm.length > 0 && confirm === next && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            Passwords match
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        {onClose && (
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={submitting}
          leftIcon={<KeyRound className="h-4 w-4" />}
        >
          Update password
        </Button>
      </div>
    </form>
  );
}
