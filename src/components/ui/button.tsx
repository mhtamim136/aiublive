"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "subtle"
  | "destructive";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ring-focus disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm hover:shadow-glow",
  secondary:
    "bg-foreground text-background hover:bg-foreground/85 active:scale-[0.98]",
  ghost:
    "bg-transparent text-foreground hover:bg-muted/70 active:scale-[0.98]",
  outline:
    "bg-card text-foreground border border-border hover:bg-muted/60 active:scale-[0.98]",
  subtle:
    "bg-muted text-foreground hover:bg-muted/70 active:scale-[0.98]",
  destructive:
    "bg-danger text-danger-foreground hover:bg-danger/90 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && !loading && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);
Button.displayName = "Button";
