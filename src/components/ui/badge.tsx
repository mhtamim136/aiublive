import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "outline"
  | "soft";

const variantClass: Record<Variant, string> = {
  default: "bg-muted text-foreground/80",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  outline: "border border-border text-foreground/80",
  soft: "bg-foreground/5 text-foreground/80",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
