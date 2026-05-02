"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChipInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  suggestions = [],
  className,
  max,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  max?: number;
}) {
  const [input, setInput] = React.useState("");

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (value.includes(v)) return;
    if (max && value.length >= max) return;
    onChange([...value, v]);
    setInput("");
  };

  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => (input ? s.toLowerCase().includes(input.toLowerCase()) : true))
    .slice(0, 8);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl border border-input bg-card p-2 transition-all",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring",
        )}
      >
        {value.map((v) => (
          <span
            key={v}
            className="group inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-sm text-primary"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => remove(v)}
              className="rounded p-0.5 transition hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            } else if (e.key === "Backspace" && !input && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      {filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-lg border border-dashed border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
