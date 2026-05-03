"use client";

import * as React from "react";
import { CoursePicker } from "@/components/ui/course-picker";
import { Input, Label } from "@/components/ui/input";
import { X } from "lucide-react";
import { getCourse } from "@/lib/catalog";
import type { CourseEnrollment } from "@/lib/types";
import type { Department } from "@/lib/types";
import { cn } from "@/lib/utils";

function normalizeSection(s: string) {
  return s
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9._~-]/g, "")
    .slice(0, 16);
}

export function CourseEnrollmentPicker({
  value,
  onChange,
  department,
  max = 8,
  className,
}: {
  value: CourseEnrollment[];
  onChange: (next: CourseEnrollment[]) => void;
  department?: Department;
  max?: number;
  className?: string;
}) {
  const codes = value.map((e) => e.courseCode);

  const syncCodes = (nextCodes: string[]) => {
    const prev = Object.fromEntries(
      value.map((e) => [e.courseCode, e.section]),
    );
    const out: CourseEnrollment[] = nextCodes.map((courseCode) => ({
      courseCode,
      section: normalizeSection(prev[courseCode] ?? ""),
    }));
    onChange(out);
  };

  const setSection = (code: string, section: string) => {
    const sec = normalizeSection(section);
    onChange(
      value.map((e) =>
        e.courseCode === code ? { ...e, section: sec } : e,
      ),
    );
  };

  const remove = (code: string) =>
    syncCodes(value.map((e) => e.courseCode).filter((c) => c !== code));

  return (
    <div className={cn("space-y-4", className)}>
      <CoursePicker
        value={codes}
        onChange={syncCodes}
        department={department}
        max={max}
        placeholder="Scroll or search by course name…"
      />

      {value.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-card/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Sections (shown to section mates — same course + section)
          </p>
          <ul className="space-y-2">
            {value.map((e) => {
              const c = getCourse(e.courseCode);
              const title = c?.title ?? "Custom course";
              const sectionMissing = !e.section.trim();
              return (
                <li
                  key={e.courseCode}
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="truncate text-sm font-medium">
                    {title}
                  </span>
                  <div className="flex flex-1 items-start gap-2">
                    <div className="min-w-[120px] flex-1 sm:max-w-[200px]">
                      <Label className="sr-only">
                        Section for {title}
                      </Label>
                      <Input
                        value={e.section}
                        maxLength={16}
                        placeholder="e.g. A, B, G2"
                        onChange={(ev) =>
                          setSection(e.courseCode, ev.target.value)
                        }
                        className="font-mono text-sm uppercase"
                        error={sectionMissing ? "Please select section" : undefined}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(e.courseCode)}
                      className="mt-1 rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-danger"
                      aria-label={`Remove ${title}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
