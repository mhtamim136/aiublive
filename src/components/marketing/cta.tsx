"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/marketing/magnetic";
import { mockStudents } from "@/lib/mock-data";
import { avatarUrl } from "@/lib/utils";

export function CTA() {
  const sample = mockStudents.slice(0, 4);
  return (
    <section className="relative py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-card md:p-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -top-32 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-primary/20 blur-3xl" />
            <div className="absolute inset-0 dotted-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center -space-x-2.5">
              {sample.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: -6, scale: 0.7 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: 0.1 + i * 0.06,
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  }}
                  className="h-10 w-10 overflow-hidden rounded-full border-2 border-card shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(s.handle)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </div>

          <h2 className="mt-6 font-display text-3xl font-bold leading-tight md:text-5xl">
            Your tribe is{" "}
            <span className="gradient-text">a profile away</span>.
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Two minutes of setup. A semester of better study circles, project
            teams, and friendships.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic>
              <Link href="/onboarding">
                <Button
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="h-12 px-7 text-base"
                >
                  Get started — it's free
                </Button>
              </Link>
            </Magnetic>
            <Link href="/login">
              <Button size="lg" variant="ghost" className="h-12 text-base">
                Already a member? Sign in
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            No portal password. No spam. Cancel any time.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
