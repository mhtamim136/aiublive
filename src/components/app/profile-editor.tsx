"use client";

import * as React from "react";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ChipInput } from "@/components/ui/chip-input";
import { CourseEnrollmentPicker } from "@/components/ui/course-enrollment-picker";
import { Badge } from "@/components/ui/badge";
import {
  departments,
  deriveLevel,
  formatSemester,
  interestSuggestions,
  opennessOptions,
  ordinal,
  semesterNumbers,
  skillSuggestions,
} from "@/lib/catalog";
import type { Department, Project, Student } from "@/lib/types";
import { cn, resolveStudentAvatar, studentEnrollments } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const me = useStore((s) => s.me)!;
  const updateMe = useStore((s) => s.updateMe);
  const refreshSession = useStore((s) => s.refreshSession);
  const { toast } = useToast();

  const [draft, setDraft] = React.useState<Student>(() => ({
    ...me,
    courseEnrollments: studentEnrollments(me),
  }));

  const update = <K extends keyof Student>(key: K, value: Student[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    const enrollments =
      draft.courseEnrollments?.length ?
        draft.courseEnrollments
      : studentEnrollments(draft);
    const faculty =
      departments.find((d) => d.code === draft.department)?.faculty ?? draft.faculty;
    const ok = await updateMe({
      ...draft,
      courseEnrollments: enrollments,
      currentCourses: enrollments.map((e) => e.courseCode),
      vibe: draft.vibe || me.vibe,
      level: deriveLevel(draft.semester),
      faculty,
    });
    if (!ok) {
      toast({
        kind: "error",
        title: "Could not save",
        description: "Check your connection and try again.",
      });
      return;
    }
    onClose();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={onClose}
        >
          Back to profile
        </Button>
        <Button onClick={save} leftIcon={<Save className="h-4 w-4" />}>
          Save changes
        </Button>
      </div>

      <Section title="Identity">
        <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Avatar
            src={resolveStudentAvatar(draft)}
            name={draft.name}
            size={72}
          />
          <div>
            <Label className="text-xs">Profile photo</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1.5"
              onClick={() =>
                document.getElementById("avatar-file")?.click()
              }
            >
              Upload image
            </Button>
            <input
              id="avatar-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("avatar", file);
                try {
                  const res = await fetch("/api/upload/avatar", {
                    method: "POST",
                    credentials: "include",
                    body: fd,
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok || data.ok !== true)
                    throw new Error(data.message || "Upload failed");
                  if (data.student) setDraft((d) => ({ ...d, ...(data.student as Student) }));
                  await refreshSession();
                  toast({ kind: "success", title: "Photo updated" });
                } catch {
                  toast({
                    kind: "error",
                    title: "Upload failed",
                    description: "Try a smaller JPG, PNG or WebP.",
                  });
                } finally {
                  e.target.value = "";
                }
              }}
            />
            <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
              Saved as static files under{" "}
              <span className="font-mono">public/uploads/avatars</span> (max ~2.5&nbsp;MB).
            </p>
          </div>
        </div>
        <Grid>
          <div>
            <Label>Full name</Label>
            <Input
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div>
            <Label>Handle</Label>
            <Input
              value={draft.handle}
              onChange={(e) =>
                update(
                  "handle",
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9._]/g, "")
                    .slice(0, 24),
                )
              }
            />
          </div>
          <div>
            <Label>Vibe (one line)</Label>
            <Input
              value={draft.vibe}
              onChange={(e) => update("vibe", e.target.value.slice(0, 80))}
              maxLength={80}
            />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea
              value={draft.bio}
              onChange={(e) => update("bio", e.target.value.slice(0, 280))}
              maxLength={280}
            />
          </div>
        </Grid>
      </Section>

      <Section title="Academic">
        <div className="space-y-4">
          <div>
            <Label>Department</Label>
            <Select
              value={draft.department}
              onChange={(e) =>
                update("department", e.target.value as Department)
              }
            >
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>
              Current semester{" "}
              <span className="text-xs font-normal text-muted-foreground">
                — your level updates automatically
              </span>
            </Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {semesterNumbers.map((n) => {
                const active = draft.semester === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update("semester", n)}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center rounded-xl border text-sm font-medium transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-glow"
                        : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card",
                    )}
                    aria-pressed={active}
                  >
                    <span className="text-base font-semibold leading-none">
                      {ordinal(n)}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 text-[10px] uppercase tracking-wide leading-none",
                        active
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {n >= 12 ? "grad" : "sem"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              You'll show up as{" "}
              <span className="font-medium text-foreground">
                {deriveLevel(draft.semester)}
              </span>{" "}
              · {formatSemester(draft.semester)}
            </p>
          </div>

          <div>
            <Label>Mentor mode</Label>
            <button
              type="button"
              onClick={() => update("isMentor", !draft.isMentor)}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-xl border px-4 text-sm transition",
                draft.isMentor
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card",
              )}
            >
              {draft.isMentor ? "Available as mentor" : "Off"}
              <span
                className={cn(
                  "ml-2 h-4 w-7 rounded-full transition-colors",
                  draft.isMentor ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "block h-3.5 w-3.5 translate-y-[1px] rounded-full bg-background transition-transform",
                    draft.isMentor ? "translate-x-[14px]" : "translate-x-[2px]",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </Section>

      <Section title="Current courses">
        <CourseEnrollmentPicker
          value={studentEnrollments(draft)}
          onChange={(en) =>
            setDraft((d) => ({
              ...d,
              courseEnrollments: en,
              currentCourses: en.map((x) => x.courseCode),
            }))
          }
          department={draft.department}
          max={8}
        />
      </Section>

      <Section title="Skills & interests">
        <div className="space-y-4">
          <div>
            <Label>Skills</Label>
            <ChipInput
              value={draft.skills}
              onChange={(v) => update("skills", v)}
              suggestions={skillSuggestions}
              max={12}
            />
          </div>
          <div>
            <Label>Interests</Label>
            <ChipInput
              value={draft.interests}
              onChange={(v) => update("interests", v)}
              suggestions={interestSuggestions}
              max={10}
            />
          </div>
        </div>
      </Section>

      <Section title="Open to">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {opennessOptions.map((opt) => {
            const selected = draft.openTo.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  update(
                    "openTo",
                    selected
                      ? draft.openTo.filter((o) => o !== opt)
                      : [...draft.openTo, opt],
                  );
                }}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm transition",
                  selected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card hover:bg-muted/40",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Projects">
        <ProjectsEditor
          projects={draft.projects}
          onChange={(p) => update("projects", p)}
        />
      </Section>

      <Section title="Links">
        <Grid>
          <div>
            <Label>GitHub</Label>
            <Input
              value={draft.links?.github ?? ""}
              onChange={(e) =>
                update("links", { ...draft.links, github: e.target.value })
              }
              placeholder="github.com/you"
            />
          </div>
          <div>
            <Label>LinkedIn</Label>
            <Input
              value={draft.links?.linkedin ?? ""}
              onChange={(e) =>
                update("links", { ...draft.links, linkedin: e.target.value })
              }
              placeholder="in/you"
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              value={draft.links?.website ?? ""}
              onChange={(e) =>
                update("links", { ...draft.links, website: e.target.value })
              }
              placeholder="you.dev"
            />
          </div>
        </Grid>
      </Section>

      <div className="flex justify-end gap-2 pb-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} leftIcon={<Save className="h-4 w-4" />}>
          Save changes
        </Button>
      </div>
    </div>
  );
}

function ProjectsEditor({
  projects,
  onChange,
}: {
  projects: Project[];
  onChange: (next: Project[]) => void;
}) {
  const [draft, setDraft] = React.useState<Project>({
    id: "",
    title: "",
    description: "",
    tags: [],
    year: new Date().getFullYear(),
  });
  const add = () => {
    if (!draft.title.trim()) return;
    const next: Project = {
      ...draft,
      id: `p_${Math.random().toString(36).slice(2, 7)}`,
    };
    onChange([next, ...projects]);
    setDraft({
      id: "",
      title: "",
      description: "",
      tags: [],
      year: new Date().getFullYear(),
    });
  };
  const remove = (id: string) => onChange(projects.filter((p) => p.id !== id));
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4">
        <p className="text-sm font-medium">Add a project</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Project title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Year"
            value={draft.year}
            onChange={(e) =>
              setDraft({ ...draft, year: Number(e.target.value) || draft.year })
            }
          />
        </div>
        <Textarea
          className="mt-3"
          placeholder="One-paragraph description…"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <div className="mt-3">
          <ChipInput
            value={draft.tags}
            onChange={(v) => setDraft({ ...draft, tags: v })}
            placeholder="Tags (e.g. React, Hackathon)"
          />
        </div>
        <Button
          className="mt-4"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={add}
        >
          Add project
        </Button>
      </div>

      <ul className="space-y-2">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {p.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <Badge key={t} variant="soft">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(p.id)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  );
}
