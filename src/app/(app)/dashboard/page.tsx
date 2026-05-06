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
  Sparkles,
  Users2,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { StudentCard } from "@/components/app/student-card";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { avatarUrl, resolveStudentAvatar } from "@/lib/utils";
import { formatSemester, getCourse } from "@/lib/catalog";
import { avatarUrlForId } from "@/lib/avatars";
import type { Student } from "@/lib/types";

type DashboardData = {
  stats: {
    totalStudents: number;
    coursemateCount: number;
    mentorCount: number;
    peopleICanMeet: number;
    courses: { code: string; mateCount: number; mateAvatarSeeds: string[] }[];
    recentJoiners: {
      id: string;
      name: string;
      handle: string;
      department: string;
      avatarId: string | null;
      joinedAt: string;
    }[];
  };
  dailyPicks: { student: Student; reasons: string[] }[];
};

export default function DashboardPage() {
  const me = useStore((s) => s.me);
  const projects = useStore((s) => s.projects);
  // Re-fetch on any realtime tick — connection / message / new-notification
  // means stats may have shifted (new connections, new mentions, etc.).
  const realtimeConnected = useStore((s) => s.realtimeConnected);
  const notifications = useStore((s) => s.notifications);

  const campusTick = useStore((s) => s.campusTick);

  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Stats refresh on three signals:
  //   1. mount + auth changes  → always fresh on page open
  //   2. notification array length change (got a connection / message)
  //   3. campusTick — broadcast event from another user's signup
  // …plus a 60 s heartbeat as a belt-and-braces fallback for cross-instance
  // deployments where the in-process broadcast doesn't reach us.
  React.useEffect(() => {
    if (!me) return;
    let alive = true;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats/dashboard", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          stats?: DashboardData["stats"];
          dailyPicks?: DashboardData["dailyPicks"];
        };
        if (!alive) return;
        if (json.ok && json.stats) {
          setData({
            stats: json.stats,
            dailyPicks: json.dailyPicks ?? [],
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    void fetchStats();
    const id = setInterval(fetchStats, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [me, realtimeConnected, notifications.length, campusTick]);

  if (!me) return null;

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
  const stats = data?.stats;
  const dailyPicks = data?.dailyPicks ?? [];

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={`${greeting}, ${me.name.split(" ")[0]}`}
        title={
          <>
            Your campus, <span className="gradient-text">today</span>.
          </>
        }
        description="A live snapshot of who's around and what's worth your attention."
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

      {/* Quick stats — live from /api/stats/dashboard */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Users2 className="h-4 w-4" />}
          label="People you can meet"
          value={stats?.peopleICanMeet}
          loading={loading && !stats}
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Coursemates this sem"
          value={stats?.coursemateCount}
          loading={loading && !stats}
        />
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Open project teams"
          value={openProjects.length}
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Mentors available"
          value={stats?.mentorCount}
          loading={loading && !stats}
        />
      </div>

      {completion < 100 && <CompletionCard percent={completion} />}

      <Section
        title="Daily picks for you"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Smart match
          </span>
        }
        description="Three students we think you'd genuinely click with — refreshed live."
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
        {loading && !data ? (
          <CardGridSkeleton count={3} />
        ) : dailyPicks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {dailyPicks.map((p) => (
              <StudentCard
                key={p.student.id}
                student={p.student}
                reasons={p.reasons}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Add a few more skills or courses and we'll surface great matches.
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CoursesPanel
            currentCourses={me.currentCourses}
            stats={stats}
            loading={loading && !stats}
            semester={me.semester}
            isGraduate={!!me.isGraduate}
          />
        </div>
        <div>
          <ProjectsPanel />
        </div>
      </div>

      <CampusPulse
        recent={stats?.recentJoiners ?? []}
        total={stats?.totalStudents ?? 0}
        loading={loading && !stats}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border bg-card p-4 shadow-soft"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      {loading ? (
        <span className="mt-3 block h-8 w-12 animate-pulse rounded-md bg-muted/60" />
      ) : (
        <p className="mt-3 font-display text-2xl font-bold tracking-tight">
          {value ?? 0}
        </p>
      )}
    </motion.div>
  );
}

function CompletionCard({ percent }: { percent: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
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

function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-border bg-muted/30"
        />
      ))}
    </div>
  );
}

function CoursesPanel({
  currentCourses,
  stats,
  loading,
  semester,
  isGraduate,
}: {
  currentCourses: string[];
  stats: DashboardData["stats"] | undefined;
  loading: boolean;
  semester: number;
  isGraduate: boolean;
}) {
  const courseStats = stats?.courses ?? [];
  const byCode = new Map(courseStats.map((c) => [c.code, c]));

  return (
    <Section
      title="Your courses this semester"
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          {formatSemester(semester, isGraduate)}
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
      {currentCourses.length === 0 ? (
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
          {currentCourses.map((code) => {
            const c = getCourse(code);
            const courseInfo = byCode.get(code);
            const mateCount = courseInfo?.mateCount ?? (loading ? null : 0);
            const sample =
              courseInfo?.mateAvatarSeeds.slice(0, 4).map((handle) => ({
                name: handle,
                src: avatarUrl(handle),
              })) ?? [];
            return (
              <Link
                key={code}
                href={`/coursemates?code=${encodeURIComponent(code)}`}
                className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {c?.title ?? "Custom course"}
                  </p>
                  <Badge variant="soft">
                    {mateCount === null ? "…" : `${mateCount} taking`}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {code}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  {sample.length > 0 ? (
                    <AvatarStack people={sample} size={26} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {mateCount === 0 ? "Be the first" : ""}
                    </span>
                  )}
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
        {open.map((p) => (
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
              <span className="ml-auto inline-flex items-center gap-1">
                Looking for{" "}
                <span className="font-medium text-foreground">
                  {p.skillsWanted.slice(0, 2).join(", ")}
                </span>
              </span>
            </div>
          </Link>
        ))}
        {open.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No open project teams right now. Be the first to post one!
          </div>
        )}
        <Link href="/projects?new=1">
          <Button variant="outline" size="sm" className="w-full">
            Post a project
          </Button>
        </Link>
      </div>
    </Section>
  );
}

function CampusPulse({
  recent,
  total,
  loading,
}: {
  recent: DashboardData["stats"]["recentJoiners"];
  total: number;
  loading: boolean;
}) {
  return (
    <Section
      title="Campus pulse"
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Live signal
        </span>
      }
      description="Updates as students sign up, connect, and post on AIUB Live."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Trends</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-md bg-primary/10 text-primary">
                <Compass className="h-3 w-3" />
              </span>
              <span>
                {loading ? "…" : `${total + 1} students`} are on AIUB Live
                right now.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-md bg-accent/10 text-accent">
                <Sparkles className="h-3 w-3" />
              </span>
              <span>
                Live updates — no refresh needed when new students join.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">New on AIUB Live</p>
          {loading ? (
            <ul className="mt-3 space-y-3">
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-muted/40"
                />
              ))}
            </ul>
          ) : recent.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              You're early — be the first to invite people.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <Avatar
                    name={s.name}
                    src={
                      avatarUrlForId(s.avatarId) ?? avatarUrl(s.handle)
                    }
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
          )}
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/[0.08] to-accent/[0.08] p-5">
          <p className="text-sm font-semibold">Tip of the day</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a one-line vibe to your profile — students with vibes get 2×
            the connect-backs.
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

function profileCompletion(
  me: NonNullable<ReturnType<typeof useStore.getState>["me"]>,
) {
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
