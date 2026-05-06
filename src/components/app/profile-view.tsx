"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Check,
  ExternalLink,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  MessageSquare,
  Plus,
  Sparkles,
  Trophy,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Student } from "@/lib/types";
import { formatRelativeTime, resolveStudentAvatar, sectionForCourse } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { formatSemester, getCourse } from "@/lib/catalog";
import { matchReasons } from "@/lib/match";

export function ProfileView({
  student,
  isMe,
  rightAction,
}: {
  student: Student;
  isMe: boolean;
  rightAction?: React.ReactNode;
}) {
  const me = useStore((s) => s.me);
  const status = useStore((s) => s.connections[student.id] ?? "none");
  const requestConnection = useStore((s) => s.requestConnection);
  const { toast } = useToast();

  const reasons = me && !isMe ? matchReasons(me, student) : [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card"
      >
        <div className="relative h-32 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/20 md:h-44">
          <div className="absolute inset-0 dotted-bg opacity-20" />
        </div>
        <div className="-mt-12 px-6 pb-6 md:-mt-16 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-end">
              <Avatar
                name={student.name}
                src={resolveStudentAvatar(student)}
                size={104}
                className="ring-4 ring-background shadow-lg"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                    {student.name}
                  </h1>
                  {student.isMentor && (
                    <Badge variant="accent">
                      <Sparkles className="h-3 w-3" />
                      Mentor
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  @{student.handle} · {student.studentIdMasked}
                  {student.userNumber != null && (
                    <>
                      {" "}
                      ·{" "}
                      <span className="font-medium text-foreground">
                        #{student.userNumber}
                      </span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground/90">
                  {student.vibe}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {rightAction
                ? rightAction
                : !isMe && (
                    <>
                      {status === "none" && (
                        <Button
                          leftIcon={<UserPlus className="h-4 w-4" />}
                          onClick={() => {
                            requestConnection(student.id);
                            toast({
                              kind: "success",
                              title: "Connection requested",
                              description: `${student.name} will see your request soon.`,
                            });
                          }}
                        >
                          Connect
                        </Button>
                      )}
                      {status === "pending" && (
                        <Button variant="subtle" disabled>
                          Requested
                        </Button>
                      )}
                      {status === "connected" && (
                        <Button
                          variant="subtle"
                          leftIcon={<Check className="h-4 w-4" />}
                          disabled
                        >
                          Connected
                        </Button>
                      )}
                      <Link href={`/messages?to=${student.id}`}>
                        <Button
                          variant="outline"
                          leftIcon={<MessageSquare className="h-4 w-4" />}
                        >
                          Message
                        </Button>
                      </Link>
                    </>
                  )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge variant="soft">
              <GraduationCap className="h-3 w-3" />
              {student.department} · {student.level}
            </Badge>
            <Badge variant="soft">
              <BookOpen className="h-3 w-3" />
              {formatSemester(student.semester, student.isGraduate)}
            </Badge>
            <Badge variant="soft">
              Joined {formatRelativeTime(student.joinedAt)}
            </Badge>
          </div>

          {reasons.length > 0 && (
            <div className="mt-5 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.07] to-accent/[0.07] p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
                Why you'd vibe
              </p>
              <ul className="text-sm">
                {reasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground/90">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {student.bio && (
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-foreground/80">
              {student.bio}
            </p>
          )}

          {student.links && (
            <div className="mt-4 flex flex-wrap gap-2">
              {student.links.github && (
                <LinkChip
                  href={`https://${student.links.github.replace(/^https?:\/\//, "")}`}
                  icon={<Github className="h-3.5 w-3.5" />}
                  label={student.links.github}
                />
              )}
              {student.links.linkedin && (
                <LinkChip
                  href={`https://linkedin.com/${student.links.linkedin.replace(
                    /^(https?:\/\/)?(www\.)?linkedin\.com\//,
                    "",
                  )}`}
                  icon={<Linkedin className="h-3.5 w-3.5" />}
                  label={student.links.linkedin}
                />
              )}
              {student.links.website && (
                <LinkChip
                  href={`https://${student.links.website.replace(/^https?:\/\//, "")}`}
                  icon={<Globe className="h-3.5 w-3.5" />}
                  label={student.links.website}
                />
              )}
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel
            title="Skills"
            icon={<Sparkles className="h-4 w-4" />}
            empty={student.skills.length === 0}
            emptyText="No skills added yet."
          >
            <div className="flex flex-wrap gap-1.5">
              {student.skills.map((s) => (
                <Badge key={s} variant="primary">
                  {s}
                </Badge>
              ))}
            </div>
          </Panel>

          <Panel
            title="Interests"
            icon={<BookOpen className="h-4 w-4" />}
            empty={student.interests.length === 0}
            emptyText="No interests added yet."
          >
            <div className="flex flex-wrap gap-1.5">
              {student.interests.map((s) => (
                <Badge key={s} variant="accent">
                  {s}
                </Badge>
              ))}
            </div>
          </Panel>

          <Panel
            title="Projects"
            icon={<Trophy className="h-4 w-4" />}
            empty={student.projects.length === 0}
            emptyText={
              isMe
                ? "Showcase a project — even a small side project counts."
                : `${student.name.split(" ")[0]} hasn't posted projects yet.`
            }
            emptyAction={
              isMe ? (
                <Link href="/profile/me?edit=projects">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add a project
                  </Button>
                </Link>
              ) : null
            }
          >
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {student.projects.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{p.title}</p>
                    <Badge variant="soft">{p.year}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <Badge key={t} variant="soft">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      View project <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Achievements"
            icon={<Award className="h-4 w-4" />}
            empty={student.achievements.length === 0}
            emptyText={
              isMe
                ? "Add wins — competitions, dean's list, leadership."
                : `${student.name.split(" ")[0]} hasn't added achievements.`
            }
          >
            <ul className="space-y-2">
              {student.achievements.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-warning/10 text-warning">
                    <Trophy className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{a.title}</p>
                    {a.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="soft" className="shrink-0">
                    {a.year}
                  </Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Current courses"
            icon={<BookOpen className="h-4 w-4" />}
            empty={student.currentCourses.length === 0}
            emptyText="No courses added."
          >
            <ul className="space-y-2">
              {student.currentCourses.map((code) => {
                const c = getCourse(code);
                const sec = sectionForCourse(student, code);
                const title = c?.title ?? "Custom course";
                return (
                  <li
                    key={code}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {title} : {sec || "—"}
                      </p>
                    </div>
                    <Link
                      href={`/coursemates?code=${encodeURIComponent(code)}&section=${encodeURIComponent(sec)}`}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      Coursemates
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="Open to"
            icon={<UserPlus className="h-4 w-4" />}
            empty={student.openTo.length === 0}
            emptyText="—"
          >
            <div className="flex flex-wrap gap-1.5">
              {student.openTo.map((o) => (
                <Badge key={o} variant="success">
                  {o}
                </Badge>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  empty,
  emptyText,
  emptyAction,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
  emptyAction?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
        {title}
      </div>
      {empty ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          {emptyText}
          {emptyAction}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function LinkChip({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted/60"
    >
      {icon}
      {label}
    </a>
  );
}
