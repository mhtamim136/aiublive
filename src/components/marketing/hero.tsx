"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Magnetic } from "@/components/marketing/magnetic";
import { Button } from "@/components/ui/button";
import { mockStudents } from "@/lib/mock-data";
import { avatarUrl } from "@/lib/utils";
import { useAuthFlag } from "@/lib/use-auth-flag";

export function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  const spotlightX = useTransform(sx, (v) => `${v * 100}%`);
  const spotlightY = useTransform(sy, (v) => `${v * 100}%`);
  const spotlightBg = useMotionTemplate`radial-gradient(600px circle at ${spotlightX} ${spotlightY}, hsl(var(--primary) / 0.35), transparent 65%)`;

  const { scrollY } = useScroll();
  const previewY = useTransform(scrollY, [0, 600], [0, 80]);
  const previewOpacity = useTransform(scrollY, [0, 500], [1, 0.4]);

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      className="relative isolate overflow-hidden"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.45] dark:opacity-[0.35]"
        style={{ background: spotlightBg }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-10%] -z-10 h-[80vh] bg-radial-fade"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 dotted-bg opacity-[0.18] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />

      <div className="container relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <FloatingBadge />

          <RevealHeadline />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg"
          >
            A quiet, modern home for AIUB students to find batchmates, study
            partners, project teammates, and mentors. No portal logins. No
            noise. Just your people.
          </motion.p>

          <HeroCtas />


          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            No portal password — ever · PBKDF2-hashed locally
          </motion.span>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.8 }}
            className="mt-10"
          >
            <PeopleAvatars />
          </motion.div>
        </div>

        <motion.div
          style={{ y: previewY, opacity: previewOpacity }}
          className="mt-20 md:mt-24"
        >
          <FloatingPreview />
        </motion.div>
      </div>
    </section>
  );
}

function HeroCtas() {
  const authed = useAuthFlag();
  // Hero CTA always says "Get Started"; if the user is already signed in,
  // we send them straight to the dashboard so they're never asked to
  // re-onboard. The secondary "Login" button mirrors the same shortcut.
  const startHref = authed ? "/dashboard" : "/onboarding";
  const loginHref = authed ? "/dashboard" : "/login";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.6, ease: "easeOut" }}
      className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
    >
      <Magnetic>
        <Link href={startHref}>
          <Button
            size="lg"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="h-12 px-7 text-base"
          >
            Get Started
          </Button>
        </Link>
      </Magnetic>
      <Link href={loginHref}>
        <Button size="lg" variant="outline" className="h-12 px-6 text-base">
          {authed ? "Open dashboard" : "Login"}
        </Button>
      </Link>
    </motion.div>
  );
}

function FloatingBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-soft backdrop-blur"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      Built independently for AIUB students
    </motion.div>
  );
}

const headlineWords = [
  { text: "Hey" },
  { text: "AIUB" },
  { text: "—" },
  { text: "your" },
  { text: "people" },
  { text: "are" },
  { text: "already", gradient: true },
  { text: "here.", gradient: true },
];

function RevealHeadline() {
  return (
    <h1 className="font-display text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
      {headlineWords.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: 0.05 + i * 0.07,
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={`inline-block ${w.gradient ? "gradient-text" : ""}`}
        >
          {w.text}
          {i < headlineWords.length - 1 && "\u00A0"}
        </motion.span>
      ))}
    </h1>
  );
}

function PeopleAvatars() {
  const sample = mockStudents.slice(0, 5);
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center -space-x-2.5">
        {sample.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.6, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{
              delay: 0.9 + i * 0.06,
              type: "spring",
              stiffness: 280,
              damping: 20,
            }}
            className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-background bg-muted shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(s.handle)}
              alt={s.name}
              className="h-full w-full object-cover"
            />
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Aarav, Tasnia, Rafi & 2,300+ others are already on AIUB Live.
      </p>
    </div>
  );
}

function FloatingPreview() {
  const sample = mockStudents.slice(0, 3);
  return (
    <div className="relative mx-auto max-w-5xl">
      <div
        aria-hidden
        className="absolute -inset-x-10 -top-10 h-60 rounded-[3rem] bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 blur-3xl"
      />

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
        {sample.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 30, rotate: i === 1 ? 0 : i === 0 ? -2 : 2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            whileHover={{ y: -6, rotate: 0 }}
            transition={{
              delay: 0.05 + i * 0.1,
              type: "spring",
              stiffness: 120,
              damping: 18,
            }}
            className="group relative rounded-2xl border border-border bg-card/90 p-5 shadow-card backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(s.handle)}
                  alt={s.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.department} · {s.level}
                </p>
              </div>
              {s.isMentor && (
                <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                  Mentor
                </span>
              )}
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {s.vibe}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {s.skills.slice(0, 3).map((sk) => (
                <span
                  key={sk}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {sk}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>
                Both in{" "}
                <span className="font-mono text-foreground/80">
                  {s.currentCourses[0] ?? "—"}
                </span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
