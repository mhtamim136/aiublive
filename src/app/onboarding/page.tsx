"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  BookOpen,
  Wand2,
  Heart,
  CheckCircle2,
  KeyRound,
  IdCard,
  ShieldAlert,
} from "lucide-react";
import { StepShell, type StepInfo } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChipInput } from "@/components/ui/chip-input";
import { CourseEnrollmentPicker } from "@/components/ui/course-enrollment-picker";
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
import { useStore } from "@/lib/store";
import { evaluatePassword } from "@/lib/crypto";
import type {
  CourseEnrollment,
  Department,
  Student,
} from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const steps: StepInfo[] = [
  { id: "credentials", label: "Account & security", tagline: "Student ID + password" },
  { id: "identity", label: "Profile basics", tagline: "Your name & handle" },
  { id: "academic", label: "Academic life", tagline: "Department & semester" },
  { id: "courses", label: "Current courses", tagline: "This semester only" },
  { id: "skills", label: "Skills & interests", tagline: "What you're into" },
  { id: "openness", label: "Open to", tagline: "How you want to connect" },
  { id: "finishing", label: "A little about you", tagline: "Bio & vibe" },
];

const sideContent: Record<
  number,
  { title: string; highlight: React.ReactNode }
> = {
  0: {
    title: "First — let's lock down your account.",
    highlight: (
      <>
        Your AIUB student ID is your username on AIUB Live. Pick a strong
        password — the server hashes it with bcrypt over HTTPS-ready cookies
        and never stores plaintext passwords. We never touch the AIUB portal.
      </>
    ),
  },
  1: {
    title: "What should people call you?",
    highlight: (
      <>
        Your name appears on your profile. Your handle (@you) is how others
        @-mention you and visit your profile.
      </>
    ),
  },
  2: {
    title: "Where do you fit on campus?",
    highlight: (
      <>
        Your department and semester power your matches and coursemate
        suggestions. Your level (Freshman / Sophomore / Junior / Senior) is
        set automatically.
      </>
    ),
  },
  3: {
    title: "What are you taking right now?",
    highlight: (
      <>
        Search by code (CSC1102) or by name (Introduction to Programming) —
        either works. Add only the courses you're actively enrolled in.
      </>
    ),
  },
  4: {
    title: "What are you actually good at?",
    highlight: (
      <>
        Skills attract teammates. Interests attract conversation. Pick what
        feels true today, not aspirational fluff.
      </>
    ),
  },
  5: {
    title: "What do you want from AIUB Live?",
    highlight: (
      <>
        Tell people how you want to connect — study sessions, project teams,
        mentorship, or just casual chats.
      </>
    ),
  },
  6: {
    title: "Last bit — let people meet the real you.",
    highlight: (
      <>
        A vibe line and a short bio. Skip if you want, you can always edit
        later.
      </>
    ),
  },
};

type FormState = {
  studentIdRaw: string;
  password: string;
  confirmPassword: string;
  name: string;
  handle: string;
  department: Department | "";
  semester: number;
  courseEnrollments: CourseEnrollment[];
  skills: string[];
  interests: string[];
  openTo: Student["openTo"];
  isMentor: boolean;
  bio: string;
  vibe: string;
  links: { github?: string; linkedin?: string; website?: string };
};

const initialForm: FormState = {
  studentIdRaw: "",
  password: "",
  confirmPassword: "",
  name: "",
  handle: "",
  department: "",
  semester: 1,
  courseEnrollments: [],
  skills: [],
  interests: [],
  openTo: [],
  isMentor: false,
  bio: "",
  vibe: "",
  links: {},
};

const studentIdRegex = /^\d{2}-\d{5}-\d$/;

function maskId(raw: string) {
  if (!raw) return "—";
  const m = raw.match(/^(\d{2})-(\d{5})-(\d)$/);
  if (!m) return raw;
  return `${m[1]}-XXXXX-${m[3]}`;
}

function deriveHandle(name: string) {
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .join(".")
    .slice(0, 20);
}

function formatStudentIdInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  if (digits.length > 0) out += digits.slice(0, 2);
  if (digits.length > 2) out += "-" + digits.slice(2, 7);
  if (digits.length > 7) out += "-" + digits.slice(7, 8);
  return out;
}

export default function OnboardingPage() {
  const router = useRouter();
  const refreshSession = useStore((s) => s.refreshSession);
  const me = useStore((s) => s.me);
  const { toast } = useToast();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [remoteIdTaken, setRemoteIdTaken] = React.useState(false);

  React.useEffect(() => {
    if (me) router.replace("/dashboard");
  }, [me, router]);

  React.useEffect(() => {
    let cancelled = false;
    if (!studentIdRegex.test(form.studentIdRaw)) {
      setRemoteIdTaken(false);
      return undefined;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/exists?studentId=${encodeURIComponent(form.studentIdRaw)}`,
          { credentials: "include" },
        );
        const j = await res.json().catch(() => ({}));
        if (!cancelled) setRemoteIdTaken(Boolean(j.exists));
      } catch {
        if (!cancelled) setRemoteIdTaken(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.studentIdRaw]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const passwordReport = React.useMemo(
    () =>
      evaluatePassword(form.password, {
        name: form.name,
        studentId: form.studentIdRaw,
        handle: form.handle,
      }),
    [form.password, form.name, form.studentIdRaw, form.handle],
  );

  const validateStep = (i: number) => {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!studentIdRegex.test(form.studentIdRaw))
        e.studentIdRaw = "Format: XX-XXXXX-X (e.g., 22-12345-1)";
      else if (remoteIdTaken)
        e.studentIdRaw =
          "An account already exists with this ID. Sign in instead.";
      if (!passwordReport.passed)
        e.password = "Password doesn't meet the requirements yet.";
      if (form.confirmPassword !== form.password)
        e.confirmPassword = "Passwords don't match.";
    }
    if (i === 1) {
      if (!form.name.trim() || form.name.trim().length < 2)
        e.name = "Tell us your name";
      if (!form.handle.trim() || form.handle.length < 3)
        e.handle = "At least 3 characters";
    }
    if (i === 2) {
      if (!form.department) e.department = "Pick your department";
      if (!form.semester || form.semester < 1)
        e.semester = "Pick your current semester";
    }
    if (i === 3) {
      if (form.courseEnrollments.length === 0)
        e.courseEnrollments = "Add at least 1 course you're taking now";
    }
    if (i === 4) {
      if (form.skills.length < 2) e.skills = "At least 2 skills, please";
    }
    if (i === 5) {
      if (form.openTo.length === 0)
        e.openTo = "Tell us how you'd like to connect";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validateStep(stepIndex)) return;
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      await finish();
    }
  };

  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const finish = async () => {
    if (!form.department) return;
    setSubmitting(true);
    try {
      const dept = departments.find((d) => d.code === form.department)!;
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.studentIdRaw,
          password: form.password,
          profile: {
            name: form.name.trim(),
            handle: form.handle.trim().toLowerCase(),
            department: form.department,
            faculty: dept.faculty,
            semester: form.semester,
            bio: form.bio.trim(),
            vibe:
              form.vibe.trim() ||
              "Just another AIUB student finding their tribe.",
            isMentor: form.isMentor,
            github: form.links.github ?? undefined,
            linkedin: form.links.linkedin ?? undefined,
            website: form.links.website ?? undefined,
            skills: form.skills,
            interests: form.interests,
            openTo: form.openTo,
            courseEnrollments: form.courseEnrollments,
            projects: [],
            achievements: [],
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) {
        const code = String(data.code ?? "");
        if (code === "id-taken" || code === "duplicate") {
          setStepIndex(0);
          setErrors({
            studentIdRaw:
              String(data.message) ||
              "That student ID already has an account. Sign in.",
          });
        } else if (code === "handle-taken") {
          setStepIndex(1);
          setErrors({
            handle: String(data.message) || "This handle is taken.",
          });
        } else if (code === "weak-password") {
          setErrors({ password: String(data.message) || "Weak password." });
          setStepIndex(0);
        } else if (code === "validation") {
          toast({
            kind: "error",
            title: String(data.message) || "Check your inputs",
          });
        } else {
          toast({
            kind: "error",
            title: String(data.message) || "Could not complete signup.",
          });
        }
        return;
      }

      await refreshSession();

      toast({
        kind: "success",
        title: "Welcome to AIUB Live!",
        description: "Your profile is live. Let's find your people.",
      });
      router.replace("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const dept = form.department ? (form.department as Department) : undefined;
  const derivedLevel = deriveLevel(form.semester);
  const idTaken = studentIdRegex.test(form.studentIdRaw) && remoteIdTaken;

  return (
    <StepShell
      steps={steps}
      currentIndex={stepIndex}
      sideTitle={sideContent[stepIndex].title}
      sideHighlight={sideContent[stepIndex].highlight}
      sideFootnote={
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Passwords hashed on the server (bcrypt) · HTTPS-ready cookies &
          brute-force lockouts supported.
        </span>
      }
    >
      {stepIndex === 0 && (
        <div className="space-y-5">
          <StepHeader icon={<KeyRound />} title="Account & security" />
          <p className="text-sm text-muted-foreground">
            Your AIUB student ID is your username. Pick a strong password — it’s
            never stored as plain text on the database.
          </p>

          <div>
            <Label htmlFor="sid">AIUB student ID</Label>
            <Input
              id="sid"
              placeholder="22-12345-1"
              value={form.studentIdRaw}
              onChange={(e) =>
                update("studentIdRaw", formatStudentIdInput(e.target.value))
              }
              error={errors.studentIdRaw}
              inputMode="numeric"
              leftIcon={<IdCard className="h-4 w-4" />}
              autoFocus
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Stored masked publicly as{" "}
              <span className="font-mono">{maskId(form.studentIdRaw)}</span>{" "}
              · format only, no portal access.
            </p>
            {idTaken && !errors.studentIdRaw && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-warning">
                <ShieldAlert className="h-3 w-3" />
                Already used on this device.{" "}
                <Link
                  href={`/login?id=${encodeURIComponent(form.studentIdRaw)}`}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in instead
                </Link>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="At least 8 chars, mixed case, number, symbol"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              error={errors.password}
              autoComplete="new-password"
            />
            <div className="mt-3">
              <PasswordStrengthMeter report={passwordReport} />
            </div>
          </div>

          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput
              id="confirm"
              placeholder="Type it again"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
            {form.confirmPassword.length > 0 &&
              form.confirmPassword === form.password && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Passwords match
                </p>
              )}
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Already have an AIUB Live account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in →
            </Link>
          </div>
        </div>
      )}

      {stepIndex === 1 && (
        <div className="space-y-5">
          <StepHeader icon={<Sparkles />} title="Profile basics" />
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              placeholder="e.g. Aarav Hossain"
              value={form.name}
              onChange={(e) => {
                update("name", e.target.value);
                if (!form.handle)
                  update("handle", deriveHandle(e.target.value));
              }}
              error={errors.name}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              placeholder="aarav.h"
              value={form.handle}
              onChange={(e) =>
                update(
                  "handle",
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9._]/g, "")
                    .slice(0, 24),
                )
              }
              error={errors.handle}
              leftIcon={<span className="text-sm">@</span>}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Letters, numbers, dots and underscores only. This is how
              others find your profile.
            </p>
          </div>
        </div>
      )}

      {stepIndex === 2 && (
        <div className="space-y-5">
          <StepHeader icon={<GraduationCap />} title="Academic life" />
          <div>
            <Label htmlFor="dept">Department</Label>
            <Select
              id="dept"
              value={form.department}
              onChange={(e) =>
                update("department", e.target.value as Department)
              }
              error={errors.department}
            >
              <option value="">Select department…</option>
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
                (which semester are you in right now?)
              </span>
            </Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {semesterNumbers.map((n) => {
                const active = form.semester === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update("semester", n)}
                    className={cn(
                      "group flex h-14 flex-col items-center justify-center rounded-xl border text-sm font-medium transition-all",
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
            {errors.semester && (
              <p className="mt-1.5 text-xs text-danger">{errors.semester}</p>
            )}
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              You'll show up as{" "}
              <span className="font-medium text-foreground">{derivedLevel}</span>{" "}
              · {formatSemester(form.semester)}
            </p>
          </div>
        </div>
      )}

      {stepIndex === 3 && (
        <div className="space-y-5">
          <StepHeader icon={<BookOpen />} title="Current courses" />
          <p className="text-sm text-muted-foreground">
            Search by{" "}
            <span className="font-medium text-foreground">course name</span>{" "}
            or{" "}
            <span className="font-medium text-foreground">course code</span>{" "}
            (e.g. "Introduction to Programming" or CSC1102). Add only the
            courses you're actively taking — we use these to find your
            coursemates.
          </p>

          <CourseEnrollmentPicker
            value={form.courseEnrollments}
            onChange={(next) => update("courseEnrollments", next)}
            department={dept}
            max={8}
          />
          {errors.courseEnrollments && (
            <p className="text-xs text-danger">{errors.courseEnrollments}</p>
          )}
        </div>
      )}

      {stepIndex === 4 && (
        <div className="space-y-6">
          <StepHeader icon={<Wand2 />} title="Skills & interests" />
          <div>
            <Label>Skills (pick a few — keep it real)</Label>
            <ChipInput
              value={form.skills}
              onChange={(next) => update("skills", next)}
              placeholder="React, Figma, Marketing…"
              suggestions={skillSuggestions}
              max={12}
            />
            {errors.skills && (
              <p className="mt-1.5 text-xs text-danger">{errors.skills}</p>
            )}
          </div>
          <div>
            <Label>Interests</Label>
            <ChipInput
              value={form.interests}
              onChange={(next) => update("interests", next)}
              placeholder="Hackathons, Startups, Photography…"
              suggestions={interestSuggestions}
              max={10}
            />
          </div>
        </div>
      )}

      {stepIndex === 5 && (
        <div className="space-y-5">
          <StepHeader icon={<Heart />} title="What are you open to?" />
          <p className="text-sm text-muted-foreground">
            Pick all that apply. This helps us match you with the right
            people.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {opennessOptions.map((opt) => {
              const selected = form.openTo.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    update(
                      "openTo",
                      selected
                        ? form.openTo.filter((o) => o !== opt)
                        : [...form.openTo, opt],
                    );
                  }}
                  className={cn(
                    "group relative flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/5 shadow-glow"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{opt}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {opennessDesc[opt]}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {selected && <CheckCircle2 className="h-4 w-4" />}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.openTo && (
            <p className="text-xs text-danger">{errors.openTo}</p>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <input
              type="checkbox"
              checked={form.isMentor}
              onChange={(e) => update("isMentor", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Available as a mentor</p>
              <p className="text-xs text-muted-foreground">
                Juniors will see a "Mentor" badge on your profile. Toggle off
                anytime.
              </p>
            </div>
          </label>
        </div>
      )}

      {stepIndex === 6 && (
        <div className="space-y-5">
          <StepHeader icon={<Sparkles />} title="A little about you" />
          <div>
            <Label htmlFor="vibe">Your vibe in one line</Label>
            <Input
              id="vibe"
              placeholder="e.g. Backend nerd who codes on weekends"
              value={form.vibe}
              onChange={(e) => update("vibe", e.target.value.slice(0, 80))}
              maxLength={80}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {form.vibe.length}/80 — short and authentic wins.
            </p>
          </div>
          <div>
            <Label htmlFor="bio">Bio (optional)</Label>
            <Textarea
              id="bio"
              placeholder="What you're working on, learning, or looking for…"
              value={form.bio}
              onChange={(e) => update("bio", e.target.value.slice(0, 280))}
              maxLength={280}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {form.bio.length}/280
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="gh">GitHub</Label>
              <Input
                id="gh"
                placeholder="github.com/you"
                value={form.links.github ?? ""}
                onChange={(e) =>
                  update("links", { ...form.links, github: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="ln">LinkedIn</Label>
              <Input
                id="ln"
                placeholder="in/you"
                value={form.links.linkedin ?? ""}
                onChange={(e) =>
                  update("links", { ...form.links, linkedin: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="ws">Website</Label>
              <Input
                id="ws"
                placeholder="you.dev"
                value={form.links.website ?? ""}
                onChange={(e) =>
                  update("links", { ...form.links, website: e.target.value })
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Profile preview</p>
            <p>
              <span className="font-medium text-foreground">
                {form.name || "Your name"}
              </span>{" "}
              · @{form.handle || "your.handle"}
            </p>
            <p className="mt-0.5">
              {form.department || "Department"} · {derivedLevel} ·{" "}
              {formatSemester(form.semester)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.skills.slice(0, 6).map((s) => (
                <Badge key={s} variant="primary">
                  {s}
                </Badge>
              ))}
              {form.skills.length === 0 && (
                <Badge variant="soft">No skills yet</Badge>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={back}
          disabled={stepIndex === 0 || submitting}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <Button
          onClick={next}
          rightIcon={<ArrowRight className="h-4 w-4" />}
          size="lg"
          loading={submitting}
        >
          {stepIndex === steps.length - 1 ? "Create my account" : "Continue"}
        </Button>
      </div>
    </StepShell>
  );
}

const opennessDesc: Record<string, string> = {
  "Study Partners": "Find people in your courses to study with.",
  "Project Teammates": "Build something cool together.",
  Mentorship: "Learn from seniors or guide juniors.",
  "Casual Chat": "Open to making friends — no pressure.",
};

function StepHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
        {icon}
      </span>
      <h2 className="font-display text-xl font-semibold tracking-tight">
        {title}
      </h2>
    </div>
  );
}
