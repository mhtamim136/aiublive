"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Layers,
  Sparkles,
  UserCircle2,
  Users2,
} from "lucide-react";
import { mockStudents } from "@/lib/mock-data";
import { avatarUrl } from "@/lib/utils";
import { ordinal } from "@/lib/catalog";

export function Story() {
  return (
    <div className="relative">
      <Chapter
        eyebrow="01 · Identity"
        eyebrowIcon={<UserCircle2 className="h-3.5 w-3.5" />}
        title={
          <>
            A profile that's{" "}
            <span className="gradient-text">actually you</span>.
          </>
        }
        copy="Two minutes of setup. Add what you're studying, what you're good at, and what you're into. Skip the LinkedIn-style fluff."
        visual={<ProfileVisual />}
        align="left"
      />

      <Chapter
        eyebrow="02 · Discovery"
        eyebrowIcon={<Users2 className="h-3.5 w-3.5" />}
        title={
          <>
            We show you{" "}
            <span className="gradient-text">who's in your classroom</span>.
          </>
        }
        copy="Pick a course you're taking — see everyone else who's in it this semester. Plus three thoughtful matches each day. No infinite feed."
        visual={<DiscoveryVisual />}
        align="right"
      />

      <Chapter
        eyebrow="03 · Together"
        eyebrowIcon={<Layers className="h-3.5 w-3.5" />}
        title={
          <>
            Build, study, grow —{" "}
            <span className="gradient-text">together</span>.
          </>
        }
        copy="Form study circles. Post a project, find teammates by skill. Connect with seniors when you need a nudge. Conversations only happen with consent."
        visual={<ProjectVisual />}
        align="left"
      />
    </div>
  );
}

function Chapter({
  eyebrow,
  eyebrowIcon,
  title,
  copy,
  visual,
  align,
}: {
  eyebrow: string;
  eyebrowIcon?: React.ReactNode;
  title: React.ReactNode;
  copy: string;
  visual: React.ReactNode;
  align: "left" | "right";
}) {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container">
        <div
          className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 ${
            align === "right" ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              {eyebrowIcon}
              {eyebrow}
            </span>
            <h2 className="mt-5 font-display text-balance text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              {title}
            </h2>
            <p className="mt-5 max-w-md text-balance text-base text-muted-foreground md:text-lg">
              {copy}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.1,
            }}
          >
            {visual}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Visual 1: Profile reveals chip by chip
function ProfileVisual() {
  const skills = ["React", "Next.js", "TypeScript", "Tailwind", "Figma"];
  return (
    <div className="relative mx-auto max-w-md">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card/90 p-6 shadow-card backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-full ring-4 ring-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(mockStudents[0].handle)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">
              {mockStudents[0].name}
            </p>
            <p className="text-xs text-muted-foreground">
              CSE · {ordinal(mockStudents[0].semester)} semester
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-foreground/80">
          {mockStudents[0].vibe}
        </p>

        <div className="mt-5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.4 + i * 0.08,
                  type: "spring",
                  stiffness: 280,
                  damping: 20,
                }}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {s}
              </motion.span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Open to
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Study Partners", "Project Teammates"].map((s, i) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
              >
                {s}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Visual 2: Discovery list with stagger
function DiscoveryVisual() {
  const list = mockStudents.slice(1, 5);
  return (
    <div className="relative mx-auto max-w-md">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-accent/15 via-primary/10 to-transparent blur-3xl"
      />

      <div className="relative space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3.5 py-2.5 backdrop-blur"
        >
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-mono text-foreground">CSC2211</span>
            <span className="text-muted-foreground"> · Algorithms</span>
          </span>
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            5 classmates
          </span>
        </motion.div>

        {list.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              delay: 0.15 + i * 0.08,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-soft backdrop-blur"
          >
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(s.handle)}
                alt={s.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {s.department} · {ordinal(s.semester)} sem · {s.skills[0]}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 px-2 py-1 text-[10px] font-medium text-primary sm:inline-flex">
              <Sparkles className="h-3 w-3" />
              92% match
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Visual 3: Project card with team forming
function ProjectVisual() {
  const owner = mockStudents[0];
  const teammates = mockStudents.slice(1, 4);
  return (
    <div className="relative mx-auto max-w-md">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-emerald-400/15 via-primary/10 to-transparent blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card/90 p-6 shadow-card backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
            Open team
          </span>
          <span className="text-[10px] text-muted-foreground">2d ago</span>
        </div>

        <h3 className="mt-3 font-display text-lg font-semibold">
          Senior Project · ML Attendance
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Computer-vision attendance for classrooms. Looking for a frontend
          and a PyTorch buddy.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {["PyTorch", "React", "Python"].map((s) => (
            <span
              key={s}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[owner, ...teammates].slice(0, 3).map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.6, x: -10 }}
                  whileInView={{ opacity: 1, scale: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: 0.3 + i * 0.08,
                    type: "spring",
                    stiffness: 280,
                    damping: 20,
                  }}
                  className="h-7 w-7 overflow-hidden rounded-full border-2 border-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(m.handle)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">2 of 4</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background"
          >
            Join team
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
