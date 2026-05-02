"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Compass,
  GraduationCap,
  Layers,
  Lightbulb,
  Plus,
  Sparkles,
  Users2,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { mockStudents } from "@/lib/mock-data";
import { matchReasons, matchScore, rankBy } from "@/lib/match";
import { StudentCard } from "@/components/app/student-card";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { avatarUrl } from "@/lib/utils";
import { formatSemester, getCourse } from "@/lib/catalog";

export default function DashboardPage() {
  const me = useStore((s) => s.me);
  const projects = useStore((s) => s.projects);
  if (!me) return null;

  const ranked = rankBy(mockStudents, (s) => matchScore(me, s)).filter(
    (r) => r.score > 0,
  );
  const dailyPicks = ranked.slice(0, 3).map((r) => r.item);

  const completion = profileCompletion(me);
  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Up late"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

  const openProjects = projects.filter((p) => p.status === "open").slice(0, 3);

  const mentors = mockStudents
    .filter((s) => s.isMentor && s.id !== me.id)
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${greeting}, ${me.name.split(" ")[0]}`}
        title={
          <>
            Your campus, <span className="gradient-text">today</span>.
          </>
        }
        description="Here's a small, calm snapshot of what's worth knowing."
        actions={
          <Link href="/discover">
            <Button
              variant="outline"
              size="md"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Open discover
            </Button>
          </Link>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Users2 className="h-4 w-4" />}
          label="People you can meet"
          value={ranked.length.toString()}
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Coursemates this sem"
          value={courseMatesCount(me, mockStudents).toString()}
        />
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Open project teams"
          value={openProjects.length.toString()}
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Mentors available"
          value={mentors.length.toString()}
        />
      </div>

      {/* Profile completion if not done */}
      {completion < 100 && <CompletionCard percent={completion} />}

      {/* Daily picks */}
      <Section
        title="Daily picks for you"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Smart match
          </span>
        }
        description="Three students we think you'd genuinely click with — refreshed each day."
        cta={
          <Link href="/discover">
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              See all matches
            </Button>
          </Link>
        }
      >
        {dailyPicks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {dailyPicks.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                reasons={matchReasons(me, s)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add a few more skills or courses and we'll surface great matches.
          </p>
        )}
      </Section>

      {/* Your courses + Project teams in two columns */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CoursesPanel />
        </div>
        <div>
          <ProjectsPanel />
        </div>
      </div>

      {/* Mentors strip */}
      {mentors.length > 0 && (
        <Section
          title="Seniors open to mentor you"
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Mentor mode
            </span>
          }
          description="Borrow their journey. A 15-minute chat can save you a semester."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {mentors.map((s) => (
              <MiniMentorCard key={s.id} studentId={s.id} />
            ))}
          </div>
        </Section>
      )}

      {/* Campus pulse */}
      <CampusPulse />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border bg-card p-4 shadow-soft"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">
        {value}
      </p>
    </motion.div>
  );
}

function CompletionCard({ percent }: { percent: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-primary/[0.07] to-accent/[0.07] p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge variant="primary">
            <Zap className="h-3 w-3" />
            Quick win
          </Badge>
          <h3 className="mt-3 text-base font-semibold">
            Your profile is {percent}% complete
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A complete profile gets ~3× more relevant matches and connections.
          </p>
        </div>
        <div className="flex items-center gap-4 md:w-1/3">
          <Progress value={percent} className="flex-1" />
          <Link href="/profile/me">
            <Button size="sm" variant="primary">
              Finish setup
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function Section({
  title,
  eyebrow,
  description,
  children,
  cta,
}: {
  title: string;
  eyebrow?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {cta}
      </div>
      {children}
    </section>
  );
}

function CoursesPanel() {
  const me = useStore((s) => s.me)!;
  return (
    <Section
      title="Your courses this semester"
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          {formatSemester(me.semester)}
        </span>
      }
      description="Tap a course to see who else is taking it."
      cta={
        <Link href="/coursemates">
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            All coursemates
          </Button>
        </Link>
      }
    >
      {me.currentCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          You haven't added courses yet.{" "}
          <Link
            href="/profile/me"
            className="font-medium text-primary hover:underline"
          >
            Add some
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {me.currentCourses.map((code) => {
            const c = getCourse(code);
            const mates = mockStudents.filter(
              (s) => s.id !== me.id && s.currentCourses.includes(code),
            );
            const sample = mates.slice(0, 4).map((m) => ({
              name: m.name,
              src: avatarUrl(m.handle),
            }));
            return (
              <Link
                key={code}
                href={`/coursemates?code=${encodeURIComponent(code)}`}
                className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {code}
                  </p>
                  <Badge variant="soft">{mates.length} taking</Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {c?.title ?? "Custom course"}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <AvatarStack people={sample} size={26} />
                  <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                    See classmates →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function ProjectsPanel() {
  const projects = useStore((s) => s.projects);
  const open = projects.filter((p) => p.status === "open").slice(0, 3);
  return (
    <Section
      title="Open project teams"
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Looking for teammates
        </span>
      }
      cta={
        <Link href="/projects">
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            See all
          </Button>
        </Link>
      }
    >
      <div className="space-y-3">
        {open.map((p) => {
          const owner = mockStudents.find((s) => s.id === p.ownerId);
          return (
            <Link
              href={`/projects?id=${p.id}`}
              key={p.id}
              className="block rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold">
                    {p.title}
                  </p>
                  <p className="line-clamp-2 mt-1 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                </div>
                <Badge variant="primary" className="shrink-0">
                  {p.members.length}/{p.teamSize}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {owner && (
                  <>
                    <Avatar
                      name={owner.name}
                      src={avatarUrl(owner.handle)}
                      size={20}
                    />
                    <span>by {owner.name.split(" ")[0]}</span>
                  </>
                )}
                <span className="ml-auto inline-flex items-center gap-1">
                  Looking for{" "}
                  <span className="font-medium text-foreground">
                    {p.skillsWanted.slice(0, 2).join(", ")}
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
        <Link href="/projects?new=1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Post a project
          </Button>
        </Link>
      </div>
    </Section>
  );
}

function MiniMentorCard({ studentId }: { studentId: string }) {
  const s = mockStudents.find((x) => x.id === studentId)!;
  return (
    <Link
      href={`/profile/${s.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
    >
      <Avatar name={s.name} src={avatarUrl(s.handle)} size={42} ring />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{s.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {s.department} · {s.level}
        </p>
      </div>
      <Badge variant="accent" className="shrink-0">
        Mentor
      </Badge>
    </Link>
  );
}

function CampusPulse() {
  const me = useStore((s) => s.me)!;
  const newJoiners = mockStudents
    .filter((s) => s.id !== me.id)
    .slice(-3)
    .reverse();
  const items = [
    {
      icon: <Compass className="h-3.5 w-3.5" />,
      text: `${mockStudents.length} students explored AIUB Live this week`,
    },
    {
      icon: <Layers className="h-3.5 w-3.5" />,
      text: `4 new project teams posted in your faculty`,
    },
    {
      icon: <Sparkles className="h-3.5 w-3.5" />,
      text: `Smart match score for you: ${Math.round(70 + Math.random() * 25)}%`,
    },
  ];
  return (
    <Section
      title="Campus pulse"
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          What's moving today
        </span>
      }
      description="A calm, once-a-day snapshot. No infinite scroll."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Trends</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-md bg-primary/10 text-primary">
                  {it.icon}
                </span>
                <span>{it.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">New on AIUB Live</p>
          <ul className="mt-3 space-y-3">
            {newJoiners.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <Avatar
                  name={s.name}
                  src={avatarUrl(s.handle)}
                  size={32}
                  ring
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.department} · joined recently
                  </p>
                </div>
                <Link
                  href={`/profile/${s.id}`}
                  className="ml-auto text-xs font-medium text-primary hover:underline"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/[0.08] to-accent/[0.08] p-5">
          <p className="text-sm font-semibold">Tip of the day</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a one-line vibe to your profile — students with vibes get 2× the
            connect-backs.
          </p>
          <Link href="/profile/me">
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Update profile
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}

function profileCompletion(me: NonNullable<ReturnType<typeof useStore.getState>["me"]>) {
  let pts = 0;
  const total = 7;
  if (me.name) pts++;
  if (me.handle) pts++;
  if (me.department) pts++;
  if (me.currentCourses.length > 0) pts++;
  if (me.skills.length >= 2) pts++;
  if (me.bio || me.vibe) pts++;
  if (me.openTo.length > 0) pts++;
  return Math.round((pts / total) * 100);
}

function courseMatesCount(
  me: NonNullable<ReturnType<typeof useStore.getState>["me"]>,
  all: typeof mockStudents,
) {
  const ids = new Set<string>();
  for (const code of me.currentCourses) {
    for (const s of all) {
      if (s.id !== me.id && s.currentCourses.includes(code)) ids.add(s.id);
    }
  }
  return ids.size;
}
