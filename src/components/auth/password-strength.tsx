"use client";

import * as React from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PasswordReport } from "@/lib/crypto";

const BAR_TONE: Record<number, string> = {
  0: "bg-muted",
  1: "bg-danger",
  2: "bg-warning",
  3: "bg-amber-500",
  4: "bg-success",
};

const LABEL_TONE: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-danger",
  2: "text-warning",
  3: "text-amber-500",
  4: "text-success",
};

export function PasswordStrengthMeter({
  report,
  className,
  showChecklist = true,
}: {
  report: PasswordReport;
  className?: string;
  showChecklist?: boolean;
}) {
  const strength = report.strength;
  const segments = 4;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: segments }).map((_, i) => {
          const filled = i < strength;
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{
                opacity: filled ? 1 : 0.4,
              }}
              transition={{ duration: 0.2 }}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                filled ? BAR_TONE[strength] : "bg-muted",
              )}
            />
          );
        })}
        <span
          className={cn(
            "ml-2 w-[78px] shrink-0 text-right text-[11px] font-semibold tabular-nums",
            LABEL_TONE[strength],
          )}
        >
          {report.strengthLabel}
        </span>
      </div>

      {report.message && (
        <p className="flex items-start gap-1.5 text-[11px] text-warning">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {report.message}
        </p>
      )}

      {showChecklist && (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {report.checks.map((c) => (
            <li
              key={c.id}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-colors",
                c.passed ? "text-success" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition-colors",
                  c.passed ? "bg-success/15" : "bg-muted",
                )}
              >
                {c.passed ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <X className="h-2.5 w-2.5 opacity-60" />
                )}
              </span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
