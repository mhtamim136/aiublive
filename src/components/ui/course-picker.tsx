"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchCourses, getCourse } from "@/lib/catalog";
import type { Course, Department } from "@/lib/types";

export function CoursePicker({
  value,
  onChange,
  department,
  max = 8,
  className,
  placeholder = "Search by course name or code…",
  emptyText = "No matching courses. Try another keyword.",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  department?: Department;
  max?: number;
  className?: string;
  placeholder?: string;
  emptyText?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo<Course[]>(
    () =>
      searchCourses(query, {
        department,
        exclude: value,
        limit: 40,
      }),
    [query, department, value],
  );

  React.useEffect(() => setActiveIdx(0), [query, open]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  React.useEffect(() => {
    const el = dropdownRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const add = (code: string) => {
    if (value.includes(code)) return;
    if (value.length >= max) return;
    onChange([...value, code]);
    setQuery("");
    inputRef.current?.focus();
  };
  const remove = (code: string) => onChange(value.filter((c) => c !== code));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = results[activeIdx];
      if (c) add(c.code);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const prefixOf = (code: string) =>
    code.replace(/[^A-Z]/g, "").slice(0, 4) || code.slice(0, 3);

  return (
    <div className={cn("space-y-3", className)} ref={containerRef}>
      <div
        className={cn(
          "relative rounded-xl border border-input bg-card transition-all",
          open && "border-ring ring-2 ring-ring",
        )}
      >
        <div className="flex items-center gap-2 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            aria-controls="course-listbox"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {value.length}/{max}
          </span>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-card"
              ref={dropdownRef}
              id="course-listbox"
              role="listbox"
            >
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {emptyText}
                </p>
              ) : (
                <ul className="max-h-[28rem] overflow-y-auto py-1">
                  {results.map((c, i) => {
                    const active = i === activeIdx;
                    const prefix = prefixOf(c.code);
                    return (
                      <li
                        key={c.code}
                        data-idx={i}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => add(c.code)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-muted/70 text-foreground"
                            : "hover:bg-muted/40",
                        )}
                        role="option"
                        aria-selected={active}
                      >
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[10px] font-mono font-semibold uppercase tracking-tight",
                            active
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {prefix}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {c.title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            <span className="font-mono font-medium text-foreground/70">
                              {c.code}
                            </span>
                            <span className="mx-1.5">·</span>
                            <span>{c.credits} credit{c.credits === 1 ? "" : "s"}</span>
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {c.department}
                        </span>
                        <Plus
                          className={cn(
                            "ml-1 h-3.5 w-3.5 transition-opacity",
                            active ? "opacity-100" : "opacity-40",
                          )}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                ↑↓ to navigate · Enter to add · Esc to close ·{" "}
                <span className="font-medium text-foreground/80">
                  {results.length} course{results.length === 1 ? "" : "s"} shown
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((code) => {
            const c = getCourse(code);
            return (
              <motion.span
                key={code}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm text-primary"
              >
                <Check className="h-3 w-3 text-primary" />
                <span className="font-medium">
                  {c ? truncate(c.title, 32) : code}
                </span>
                <span className="hidden font-mono text-[10px] text-primary/70 sm:inline">
                  {code}
                </span>
                <button
                  type="button"
                  onClick={() => remove(code)}
                  className="rounded p-0.5 transition hover:bg-primary/20"
                  aria-label={`Remove ${code}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
