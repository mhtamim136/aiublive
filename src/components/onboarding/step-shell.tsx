"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export type StepInfo = { id: string; label: string; tagline?: string };

export function StepShell({
  steps,
  currentIndex,
  children,
  sideTitle,
  sideHighlight,
  sideFootnote,
}: {
  steps: StepInfo[];
  currentIndex: number;
  children: React.ReactNode;
  sideTitle: string;
  sideHighlight: React.ReactNode;
  sideFootnote?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="aurora opacity-50" aria-hidden />
      <div className="absolute inset-0 dotted-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <header className="relative z-10">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="Back to home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Save & exit
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="relative z-10 container py-8 md:py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[1fr_minmax(0,560px)]">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                {sideTitle}
              </h1>
              <div className="mt-4 text-base text-muted-foreground">
                {sideHighlight}
              </div>

              <ol className="mt-10 space-y-1.5">
                {steps.map((s, i) => {
                  const done = i < currentIndex;
                  const active = i === currentIndex;
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                        active && "bg-card",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-full text-xs font-semibold",
                          done && "bg-success text-success-foreground",
                          active && "bg-primary text-primary-foreground",
                          !done &&
                            !active &&
                            "border border-border text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <div>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            !active &&
                              !done &&
                              "text-muted-foreground",
                          )}
                        >
                          {s.label}
                        </p>
                        {s.tagline && (
                          <p className="text-xs text-muted-foreground">
                            {s.tagline}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {sideFootnote && (
                <div className="mt-10 text-xs text-muted-foreground">
                  {sideFootnote}
                </div>
              )}
            </div>
          </aside>

          <main>
            <div className="mb-6 lg:hidden">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {currentIndex + 1} of {steps.length}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">
                {steps[currentIndex]?.label}
              </h2>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500"
                  style={{
                    width: `${((currentIndex + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
