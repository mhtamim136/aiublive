"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthFlag } from "@/lib/use-auth-flag";

export function MarketingNav() {
  const { scrollY } = useScroll();
  // Subtle frost: nav background grows from transparent to glass
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.7]);
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  const authed = useAuthFlag();

  // Auth-aware destinations:
  //  - "Get Started" always says the same — but routes signed-in users
  //    straight to their dashboard so they don't loop back through onboarding.
  //  - "Login" is dedicated; clicking it while authed jumps to the dashboard
  //    instead of showing the login form again.
  const startHref = authed ? "/dashboard" : "/onboarding";
  const loginHref = authed ? "/dashboard" : "/login";

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

      <div className="container relative flex h-16 items-center justify-between gap-3">
        <Link
          href={authed ? "/dashboard" : "/"}
          aria-label="AIUB Live"
          className="rounded-lg p-1 -m-1 transition hover:opacity-80"
        >
          <Logo />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link href={loginHref} aria-label={authed ? "Open dashboard" : "Login"}>
            <Button size="sm" variant="ghost">
              {authed ? "Open app" : "Login"}
            </Button>
          </Link>
          <Link href={startHref} aria-label={authed ? "Open dashboard" : "Get Started"}>
            <Button
              size="sm"
              rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
