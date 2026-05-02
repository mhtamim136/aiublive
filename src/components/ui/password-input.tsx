"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: string;
  hideIcon?: boolean;
}

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ className, error, hideIcon, autoComplete = "current-password", ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="w-full">
      <div className="relative">
        {!hideIcon && (
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={cn(
            "h-11 w-full rounded-xl border border-input bg-card pr-11 text-sm transition-all placeholder:text-muted-foreground/70",
            "ring-focus focus-visible:border-ring",
            hideIcon ? "pl-4" : "pl-10",
            error && "border-danger focus-visible:ring-danger",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
