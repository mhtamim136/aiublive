"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BookOpen, Plus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/lib/store";
import { mockStudents } from "@/lib/mock-data";
import { courses, getCourse } from "@/lib/catalog";
import { StudentCard } from "@/components/app/student-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default function CoursematesPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const me = useStore((s) => s.me);
  const updateMe = useStore((s) => s.updateMe);
  const params = useSearchParams();
  const router = useRouter();

  const codeParam = params.get("code");
  const [activeCode, setActiveCode] = React.useState<string | null>(
    codeParam ?? me?.currentCourses[0] ?? null,
  );

  React.useEffect(() => {
    if (codeParam && codeParam !== activeCode) setActiveCode(codeParam);
  }, [codeParam, activeCode]);

  if (!me) return null;

  const myCourses = me.currentCourses;

  const setActive = (code: string) => {
    setActiveCode(code);
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    router.replace(`?code=${encodeURIComponent(code)}`, { scroll: false });
  };

  const mates = activeCode
    ? mockStudents.filter(
        (s) => s.id !== me.id && s.currentCourses.includes(activeCode),
      )
    : [];

  const courseInfo = activeCode ? getCourse(activeCode) : null;

  // Suggestions: courses the user isn't taking but other students share with them
  const suggestionMap = new Map<string, number>();
  mockStudents.forEach((s) => {
    if (s.id === me.id) return;
    s.currentCourses.forEach((c) => {
      if (!myCourses.includes(c)) {
        suggestionMap.set(c, (suggestionMap.get(c) ?? 0) + 1);
      }
    });
  });
  const suggestions = [...suggestionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code, count]) => ({ code, count }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coursemates"
        title={
          <>
            See who's in your <span className="gradient-text">classroom</span>
          </>
        }
        description="Pick a course you're taking — see everyone else in it this semester."
      />

      {myCourses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Add your current courses first"
          description="Once you add courses, this page becomes your fastest way to find classmates and study circles."
          action={
            <Link href="/profile/me">
              <Button>Go to profile</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:px-0">
            <div className="flex w-max items-center gap-2 md:flex-wrap">
              {myCourses.map((code) => {
                const c = getCourse(code);
                const count = mockStudents.filter(
                  (s) => s.id !== me.id && s.currentCourses.includes(code),
                ).length;
                const active = code === activeCode;
                return (
                  <button
                    key={code}
                    onClick={() => setActive(code)}
                    className={cn(
                      "group flex min-w-[180px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary/5 shadow-glow"
                        : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">{code}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c?.title ?? "Custom course"}
                      </p>
                    </div>
                    <Badge
                      variant={active ? "primary" : "soft"}
                      className="shrink-0"
                    >
                      <Users2 className="h-3 w-3" />
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {activeCode && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/[0.06] to-accent/[0.06] p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary">
                      {activeCode}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold">
                      {courseInfo?.title ?? "Your course"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {mates.length} classmates from your semester are on AIUB
                      Live.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/projects?new=1&course=${encodeURIComponent(activeCode)}`}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Form a study circle
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {mates.length === 0 ? (
                <EmptyState
                  title="No classmates here yet"
                  description="Be the first from your course on AIUB Live — invite a classmate."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mates.map((s) => (
                    <StudentCard key={s.id} student={s} />
                  ))}
                </div>
              )}
            </div>
          )}

          {suggestions.length > 0 && (
            <section className="rounded-2xl border border-dashed border-border bg-card/40 p-5">
              <h3 className="text-sm font-semibold">
                Popular among students like you
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Courses your peers are taking — add any if you're enrolled too.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.code}
                    onClick={() => {
                      updateMe({
                        currentCourses: [...me.currentCourses, s.code],
                      });
                      setActive(s.code);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Plus className="h-3 w-3" />
                    {s.code} · {s.count} students
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
