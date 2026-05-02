"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-input bg-card px-4 pr-10 text-sm transition-all",
          "ring-focus focus-visible:border-ring",
          error && "border-danger focus-visible:ring-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  ),
);
Select.displayName = "Select";
