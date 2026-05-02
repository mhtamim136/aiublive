"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  side,
  children,
}: {
  side?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="aurora opacity-50" aria-hidden />
      <div className="absolute inset-0 dotted-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <header className="relative z-10">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="AIUB Live home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="relative z-10 container py-8 md:py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-[1fr_minmax(0,460px)] lg:items-start">
          {side ? (
            <aside className="hidden lg:block">
              <div className="sticky top-28">{side}</div>
            </aside>
          ) : (
            <div className="hidden lg:block" aria-hidden />
          )}

          <main>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"
            >
              {children}
            </motion.div>

            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Passwords are hashed with PBKDF2-SHA256. Never sent in plaintext.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
