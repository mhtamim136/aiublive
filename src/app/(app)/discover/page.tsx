"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StudentCard } from "@/components/app/student-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore } from "@/lib/store";
import { mockStudents } from "@/lib/mock-data";
import { matchReasons, matchScore, rankBy } from "@/lib/match";
import { departments, opennessOptions } from "@/lib/catalog";
import type { Department, Student } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "match" | "newest" | "name";

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverInner />
    </Suspense>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-72 rounded-xl bg-muted/60" />
      <div className="h-11 w-full max-w-2xl rounded-xl bg-muted/60" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-56 rounded-2xl bg-muted/40" />
        ))}
      </div>
    </div>
  );
}

function DiscoverInner() {
  const me = useStore((s) => s.me);
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";

  const [q, setQ] = React.useState(initialQ);
  const [dept, setDept] = React.useState<Department | "all">("all");
  const [level, setLevel] = React.useState<Student["level"] | "all">("all");
  const [openTo, setOpenTo] = React.useState<string | "all">("all");
  const [mentorsOnly, setMentorsOnly] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>("match");
  const [showFilters, setShowFilters] = React.useState(false);

  if (!me) return null;

  const filtered = mockStudents.filter((s) => {
    if (s.id === me.id) return false;
    if (q) {
      const needle = q.toLowerCase();
      const hay = [
        s.name,
        s.handle,
        s.bio,
        s.vibe,
        s.department,
        ...s.skills,
        ...s.interests,
        ...s.currentCourses,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (dept !== "all" && s.department !== dept) return false;
    if (level !== "all" && s.level !== level) return false;
    if (
      openTo !== "all" &&
      !s.openTo.includes(openTo as Student["openTo"][number])
    )
      return false;
    if (mentorsOnly && !s.isMentor) return false;
    return true;
  });

  const sorted =
    sort === "match"
      ? rankBy(filtered, (s) => matchScore(me, s)).map((r) => r.item)
      : sort === "newest"
        ? [...filtered].sort(
            (a, b) =>
              new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime(),
          )
        : [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  const activeCount =
    (dept !== "all" ? 1 : 0) +
    (level !== "all" ? 1 : 0) +
    (openTo !== "all" ? 1 : 0) +
    (mentorsOnly ? 1 : 0);

  const clearAll = () => {
    setDept("all");
    setLevel("all");
    setOpenTo("all");
    setMentorsOnly(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Discover"
        title={
          <>
            Find your <span className="gradient-text">people</span> at AIUB
          </>
        }
        description="Search by skill, course, or department. Filter for mentors and study partners."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, skill, course, or department…"
          leftIcon={<Search className="h-4 w-4" />}
          className="lg:flex-1"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 w-auto"
          >
            <option value="match">Best match</option>
            <option value="newest">Newest joined</option>
            <option value="name">A → Z</option>
          </Select>
          <Button
            variant={showFilters ? "primary" : "outline"}
            size="md"
            onClick={() => setShowFilters((v) => !v)}
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          >
            Filters
            {activeCount > 0 && (
              <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 text-xs">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Department
            </label>
            <Select
              value={dept}
              onChange={(e) => setDept(e.target.value as typeof dept)}
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Level
            </label>
            <Select
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
            >
              <option value="all">All levels</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Graduate">Graduate</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Open to
            </label>
            <Select
              value={openTo}
              onChange={(e) => setOpenTo(e.target.value)}
            >
              <option value="all">Anything</option>
              {opennessOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-muted-foreground">
              Quick toggles
            </label>
            <button
              onClick={() => setMentorsOnly((v) => !v)}
              className={cn(
                "mt-1.5 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-all",
                mentorsOnly
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted/40",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Mentors only
              </span>
              <span
                className={cn(
                  "h-4 w-7 rounded-full transition-colors",
                  mentorsOnly ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "block h-3.5 w-3.5 translate-y-[1px] rounded-full bg-background transition-transform",
                    mentorsOnly ? "translate-x-[14px]" : "translate-x-[2px]",
                  )}
                />
              </span>
            </button>
          </div>

          {activeCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="h-3.5 w-3.5" />}
                onClick={clearAll}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="soft">
          <Users2 className="h-3 w-3" />
          {sorted.length} students
        </Badge>
        {q && (
          <ActiveChip onClear={() => setQ("")}>Search: &quot;{q}&quot;</ActiveChip>
        )}
        {dept !== "all" && (
          <ActiveChip onClear={() => setDept("all")}>
            Dept: {dept}
          </ActiveChip>
        )}
        {level !== "all" && (
          <ActiveChip onClear={() => setLevel("all")}>
            Level: {level}
          </ActiveChip>
        )}
        {openTo !== "all" && (
          <ActiveChip onClear={() => setOpenTo("all")}>
            Open to: {openTo}
          </ActiveChip>
        )}
        {mentorsOnly && (
          <ActiveChip onClear={() => setMentorsOnly(false)}>
            Mentors only
          </ActiveChip>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-5 w-5" />}
          title="No matches with these filters"
          description="Try clearing a filter or broadening your search."
          action={
            <Button variant="outline" onClick={clearAll}>
              Clear all filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              reasons={matchReasons(me, s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveChip({
  children,
  onClear,
}: {
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
      {children}
      <button
        onClick={onClear}
        aria-label="Clear"
        className="rounded p-0.5 hover:bg-primary/20"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
