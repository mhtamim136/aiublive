"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function MarketingNav() {
  const { scrollY } = useScroll();
  // Subtle frost: nav background grows from transparent to glass
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.7]);
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  return (
    <header className="sticky top-0 z-40 w-full">
      <motion.div
        style={{
          backgroundColor: "hsl(var(--background) / 0.7)",
          opacity: bgOpacity,
        }}
        className="absolute inset-0 backdrop-blur-xl"
        aria-hidden
      />
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute inset-x-0 bottom-0 h-px bg-border"
        aria-hidden
      />

      <div className="container relative flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="AIUB Live"
          className="rounded-lg p-1 -m-1 transition hover:opacity-80"
        >
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden sm:inline-flex">
            <Button size="sm" variant="ghost">
              Sign in
            </Button>
          </Link>
          <Link href="/onboarding">
            <Button
              size="sm"
              rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
