"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Check,
  Filter,
  Layers,
  Plus,
  Search,
  Users2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { ChipInput } from "@/components/ui/chip-input";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore } from "@/lib/store";
import { mockStudents } from "@/lib/mock-data";
import { skillSuggestions } from "@/lib/catalog";
import type { ProjectPost } from "@/lib/types";
import { avatarUrl, cn, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const me = useStore((s) => s.me);
  const projects = useStore((s) => s.projects);
  const params = useSearchParams();
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "open" | "mine">("all");
  const [q, setQ] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (params.get("new") === "1") setCreateOpen(true);
    const id = params.get("id");
    if (id) setActiveId(id);
  }, [params]);

  if (!me) return null;

  let filtered = projects.slice();
  if (filter === "open") filtered = filtered.filter((p) => p.status === "open");
  if (filter === "mine")
    filtered = filtered.filter(
      (p) => p.ownerId === me.id || p.members.includes(me.id),
    );
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((p) =>
      [p.title, p.description, ...p.tags, ...p.skillsWanted]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  filtered = filtered.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const active = activeId ? projects.find((p) => p.id === activeId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Projects"
        title={
          <>
            Build <span className="gradient-text">together</span>, faster.
          </>
        }
        description="Post a project idea, find teammates, or join an open team. Skills-first."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Post a project
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects, skills, tags…"
          leftIcon={<Search className="h-4 w-4" />}
          className="lg:flex-1"
        />
        <div className="flex items-center gap-2">
          {(
            [
              { id: "all", label: "All" },
              { id: "open", label: "Open" },
              { id: "mine", label: "Mine" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                filter === f.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:bg-muted/60",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-5 w-5" />}
          title="No projects match your filters"
          description="Try clearing search or post the first project."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              Post a project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={() => {
                setActiveId(p.id);
                router.replace(`/projects?id=${p.id}`, { scroll: false });
              }}
            />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          router.replace("/projects", { scroll: false });
        }}
        title="Post a project"
        description="Tell people what you're building and what skills you need."
        size="lg"
      >
        <CreateProjectForm
          onCreated={() => {
            setCreateOpen(false);
            router.replace("/projects", { scroll: false });
          }}
        />
      </Modal>

      <Modal
        open={!!active}
        onClose={() => {
          setActiveId(null);
          router.replace("/projects", { scroll: false });
        }}
        size="lg"
        title={active?.title}
        description={active ? `Posted ${formatRelativeTime(active.createdAt)}` : ""}
      >
        {active && <ProjectDetail project={active} />}
      </Modal>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectPost;
  onOpen: () => void;
}) {
  const owner = mockStudents.find((s) => s.id === project.ownerId);
  const members = project.members
    .map((id) => mockStudents.find((s) => s.id === id))
    .filter(Boolean) as typeof mockStudents;

  const open = project.status === "open";

  return (
    <button
      onClick={onOpen}
      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant={open ? "primary" : "soft"}>
          {open ? "Open" : project.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          <Calendar className="mr-1 inline h-3 w-3" />
          {formatRelativeTime(project.createdAt)}
        </span>
      </div>
      <h3 className="mt-3 font-display text-base font-semibold leading-snug">
        {project.title}
      </h3>
      <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">
        {project.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.skillsWanted.slice(0, 4).map((s) => (
          <Badge key={s} variant="primary">
            {s}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          {owner && (
            <Avatar
              name={owner.name}
              src={avatarUrl(owner.handle)}
              size={24}
            />
          )}
          <span className="text-xs text-muted-foreground">
            by{" "}
            <span className="font-medium text-foreground">
              {owner?.name.split(" ")[0] ?? "Someone"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AvatarStack
            people={members.map((m) => ({
              name: m!.name,
              src: avatarUrl(m!.handle),
            }))}
            size={22}
          />
          <Badge variant="soft">
            <Users2 className="h-3 w-3" />
            {project.members.length}/{project.teamSize}
          </Badge>
        </div>
      </div>
    </button>
  );
}

function ProjectDetail({ project }: { project: ProjectPost }) {
  const me = useStore((s) => s.me)!;
  const join = useStore((s) => s.joinProject);
  const { toast } = useToast();
  const owner = mockStudents.find((s) => s.id === project.ownerId);
  const isOwner = project.ownerId === me.id;
  const joined = project.members.includes(me.id);
  const isFull = project.members.length >= project.teamSize;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={project.status === "open" ? "primary" : "soft"}>
          {project.status}
        </Badge>
        <Badge variant="soft">
          <Users2 className="h-3 w-3" />
          {project.members.length}/{project.teamSize} teammates
        </Badge>
        <Badge variant="soft">
          <Calendar className="h-3 w-3" />
          Posted {formatRelativeTime(project.createdAt)}
        </Badge>
        {project.tags.map((t) => (
          <Badge key={t} variant="soft">
            {t}
          </Badge>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-foreground/90">
        {project.description}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Skills wanted
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.skillsWanted.map((s) => (
              <Badge key={s} variant="primary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Roles needed
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.rolesNeeded.map((r) => (
              <Badge key={r} variant="accent">
                {r}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Team
        </p>
        <ul className="mt-2 space-y-2">
          {project.members.map((id) => {
            const s = mockStudents.find((x) => x.id === id);
            const isMine = id === me.id;
            return (
              <li key={id} className="flex items-center gap-3">
                <Avatar
                  name={s?.name ?? me.name}
                  src={avatarUrl(s?.handle ?? me.handle)}
                  size={32}
                  ring
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {isMine ? "You" : s?.name ?? "Member"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s?.department ?? me.department} ·{" "}
                    {id === project.ownerId ? "Owner" : "Member"}
                  </p>
                </div>
                {!isMine && s && (
                  <Link
                    href={`/profile/${s.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Profile
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {isOwner ? (
          <Badge variant="success">
            <Check className="h-3 w-3" />
            You posted this
          </Badge>
        ) : joined ? (
          <Badge variant="success">
            <Check className="h-3 w-3" />
            You're on the team
          </Badge>
        ) : isFull ? (
          <Badge variant="soft">Team is full</Badge>
        ) : (
          <Button
            onClick={() => {
              join(project.id, me.id);
              toast({
                kind: "success",
                title: "Request sent",
                description:
                  "The project owner will see your request and reach out.",
              });
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Join the team
          </Button>
        )}
      </div>
    </div>
  );
}

function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  const create = useStore((s) => s.createProject);
  const { toast } = useToast();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [skills, setSkills] = React.useState<string[]>([]);
  const [roles, setRoles] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [teamSize, setTeamSize] = React.useState(3);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 4) e.title = "Give it a clearer title";
    if (description.trim().length < 20)
      e.description = "Describe a bit more — at least a sentence or two";
    if (skills.length === 0) e.skills = "Add at least 1 skill you need";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    create({
      title: title.trim(),
      description: description.trim(),
      skillsWanted: skills,
      rolesNeeded: roles.length > 0 ? roles : ["Teammate"],
      teamSize: Math.max(2, Math.min(8, teamSize)),
      tags,
    });
    toast({
      kind: "success",
      title: "Project posted",
      description: "Other students can now see and join your project.",
    });
    onCreated();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AIUB carpool app"
          error={errors.title}
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What you're building, why, and the kind of teammate you'd love."
          error={errors.description}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Skills you need</Label>
          <ChipInput
            value={skills}
            onChange={setSkills}
            suggestions={skillSuggestions}
            placeholder="React, Figma…"
          />
          {errors.skills && (
            <p className="mt-1 text-xs text-danger">{errors.skills}</p>
          )}
        </div>
        <div>
          <Label>Roles needed</Label>
          <ChipInput
            value={roles}
            onChange={setRoles}
            placeholder="Frontend, Designer, ML…"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Tags</Label>
          <ChipInput
            value={tags}
            onChange={setTags}
            placeholder="Capstone, Hackathon, Web…"
          />
        </div>
        <div>
          <Label>Team size</Label>
          <Input
            type="number"
            min={2}
            max={8}
            value={teamSize}
            onChange={(e) =>
              setTeamSize(
                Math.max(2, Math.min(8, Number(e.target.value) || 3)),
              )
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Counting yourself.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCreated}>
          Cancel
        </Button>
        <Button onClick={submit} leftIcon={<Layers className="h-4 w-4" />}>
          Post project
        </Button>
      </div>
    </div>
  );
}
