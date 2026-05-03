"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BookOpen, Plus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/lib/store";
import { mockStudents } from "@/lib/mock-data";
import { getCourse } from "@/lib/catalog";
import { StudentCard } from "@/components/app/student-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, sectionForCourse, studentEnrollments } from "@/lib/utils";
import type { Student } from "@/lib/types";

export default function CoursematesPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

type SectionMode = "all" | "section";

function Inner() {
  const me = useStore((s) => s.me);
  const updateMe = useStore((s) => s.updateMe);
  const params = useSearchParams();
  const router = useRouter();

  const codeParam = params.get("code");
  const sectionParam = params.get("section");

  const [activeCode, setActiveCode] = React.useState<string | null>(
    codeParam ?? me?.currentCourses[0] ?? null,
  );
  const [mates, setMates] = React.useState<Student[]>([]);
  const [sectionMode, setSectionMode] = React.useState<SectionMode>(
    sectionParam ? "section" : "all",
  );

  React.useEffect(() => {
    if (codeParam && codeParam !== activeCode) setActiveCode(codeParam);
  }, [codeParam, activeCode]);

  React.useEffect(() => {
    if (!me || !activeCode) {
      setMates([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const qs = new URLSearchParams({ course: activeCode });
        if (sectionMode === "section") {
          const sec =
            (sectionParam && sectionParam.trim()) ||
            sectionForCourse(me, activeCode);
          qs.set("section", sec);
        }
        const res = await fetch(`/api/coursemates?${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if ((data.ok as boolean) === true && Array.isArray(data.students)) {
          setMates(data.students as Student[]);
        } else {
          setMates([]);
        }
      } catch {
        if (alive) setMates([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [me, activeCode, sectionMode, sectionParam]);

  if (!me) return null;

  const myCourses = me.currentCourses;

  const setActive = (code: string) => {
    setActiveCode(code);
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    if (sectionMode === "section") {
      url.searchParams.set("section", sectionForCourse(me, code));
    } else {
      url.searchParams.delete("section");
    }
    router.replace(`${url.pathname}?${url.searchParams}`, { scroll: false });
  };

  const courseInfo = activeCode ? getCourse(activeCode) : null;

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

  const mySec = activeCode ? sectionForCourse(me, activeCode) : "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coursemates"
        title={
          <>
            See who's in your <span className="gradient-text">classroom</span>
          </>
        }
        description="Pick a course — browse everyone enrolled, or filter down to your exact section mates."
      />

      {myCourses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Add your current courses first"
          description="Once you add courses (and sections) on your profile, this page shows real classmates from the directory."
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
                const active = code === activeCode;
                const count =
                  active && mates.length ? mates.length : undefined;
                const title = c?.title ?? "Custom course";
                const sec = sectionForCourse(me, code);
                return (
                  <button
                    key={code}
                    onClick={() => setActive(code)}
                    className={cn(
                      "group flex min-w-[200px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary/5 shadow-glow"
                        : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {title} : {sec || "—"}
                      </p>
                    </div>
                    <Badge
                      variant={active ? "primary" : "soft"}
                      className="shrink-0"
                    >
                      <Users2 className="h-3 w-3" />
                      {count ?? "—"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {activeCode && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={sectionMode === "all" ? "primary" : "outline"}
                  onClick={() => {
                    setSectionMode("all");
                    const url = new URL(window.location.href);
                    url.searchParams.delete("section");
                    router.replace(
                      `${url.pathname}?${url.searchParams}`,
                      { scroll: false },
                    );
                  }}
                >
                  All coursemates
                </Button>
                <Button
                  size="sm"
                  variant={sectionMode === "section" ? "primary" : "outline"}
                  onClick={() => {
                    setSectionMode("section");
                    const url = new URL(window.location.href);
                    url.searchParams.set("section", mySec);
                    router.replace(
                      `${url.pathname}?${url.searchParams}`,
                      { scroll: false },
                    );
                  }}
                >
                  My section ({mySec})
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/[0.06] to-accent/[0.06] p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      {courseInfo?.title ?? "Your course"}
                      {sectionMode === "section" && mySec ? (
                        <span className="text-foreground/70"> : {mySec}</span>
                      ) : null}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sectionMode === "section" ?
                        `${mates.length} students in section ${mySec} on AIUB Live.`
                      : `${mates.length} students share this course on AIUB Live.`}
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
                  description="Invite someone from this course/section to join AIUB Live — or widen to all coursemates."
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
                {suggestions.map((s) => {
                  const sc = getCourse(s.code);
                  const title = sc?.title ?? "Custom course";
                  return (
                    <button
                      key={s.code}
                      onClick={async () => {
                        const en = studentEnrollments(me);
                        if (en.some((e) => e.courseCode === s.code)) {
                          setActive(s.code);
                          return;
                        }
                        const next = [
                          ...en,
                          { courseCode: s.code, section: "A" },
                        ];
                        const ok = await updateMe({
                          courseEnrollments: next,
                          currentCourses: next.map((e) => e.courseCode),
                        });
                        if (ok) setActive(s.code);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Plus className="h-3 w-3" />
                      {title} · {s.count} students
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
