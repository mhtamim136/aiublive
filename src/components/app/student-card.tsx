"use client";

import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  Plus,
  Sparkles,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Student } from "@/lib/types";
import { avatarUrl, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function StudentCard({
  student,
  reasons,
  variant = "default",
}: {
  student: Student;
  reasons?: string[];
  variant?: "default" | "compact";
}) {
  const connections = useStore((s) => s.connections);
  const requestConnection = useStore((s) => s.requestConnection);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const bookmarks = useStore((s) => s.bookmarks);
  const { toast } = useToast();
  const status = connections[student.id] ?? "none";
  const bookmarked = bookmarks.includes(student.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card",
      )}
    >
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${student.id}`}
          className="shrink-0"
          aria-label={`View ${student.name}'s profile`}
        >
          <Avatar
            name={student.name}
            src={avatarUrl(student.handle)}
            size={48}
            ring
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${student.id}`}
              className="truncate text-sm font-semibold transition-colors hover:text-primary"
            >
              {student.name}
            </Link>
            {student.isMentor && (
              <Badge variant="accent" className="shrink-0">
                Mentor
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            @{student.handle} · {student.department} · {student.level}
          </p>
        </div>
        <button
          onClick={() => {
            toggleBookmark(student.id);
            toast({
              kind: "info",
              title: bookmarked ? "Removed from saved" : "Saved for later",
            });
          }}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={bookmarked ? "Unsave" : "Save"}
        >
          {bookmarked ? (
            <BookmarkCheck className="h-4 w-4 text-primary" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-foreground/80">
        {student.vibe}
      </p>

      {variant !== "compact" && reasons && reasons.length > 0 && (
        <div className="mt-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            {reasons[0]}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {student.skills.slice(0, 4).map((s) => (
          <Badge key={s} variant="primary">
            {s}
          </Badge>
        ))}
        {student.skills.length > 4 && (
          <Badge variant="soft">+{student.skills.length - 4}</Badge>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link
          href={`/profile/${student.id}`}
          className="flex-1"
          tabIndex={-1}
        >
          <Button variant="outline" size="sm" className="w-full">
            View profile
          </Button>
        </Link>
        {status === "none" && (
          <Button
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => {
              requestConnection(student.id);
              toast({
                kind: "success",
                title: "Connection requested",
                description: `${student.name} will see your request.`,
              });
            }}
          >
            Connect
          </Button>
        )}
        {status === "pending" && (
          <Button size="sm" variant="subtle" disabled>
            Requested
          </Button>
        )}
        {status === "connected" && (
          <Button
            size="sm"
            variant="subtle"
            leftIcon={<Check className="h-3.5 w-3.5" />}
            disabled
          >
            Connected
          </Button>
        )}
      </div>
    </motion.div>
  );
}
