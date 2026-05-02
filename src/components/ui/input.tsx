"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, type = "text", ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </span>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              "h-11 w-full rounded-xl border border-input bg-card px-4 text-sm transition-all placeholder:text-muted-foreground/70",
              "ring-focus focus-visible:border-ring",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-danger focus-visible:ring-danger",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <textarea
      ref={ref}
      className={cn(
        "min-h-[100px] w-full rounded-xl border border-input bg-card px-4 py-3 text-sm transition-all placeholder:text-muted-foreground/70 resize-y",
        "ring-focus focus-visible:border-ring",
        error && "border-danger focus-visible:ring-danger",
        className,
      )}
      {...props}
    />
    {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
  </div>
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-foreground/90",
        className,
      )}
      {...props}
    />
  );
}
