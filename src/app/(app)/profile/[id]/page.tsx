"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { mockStudents } from "@/lib/mock-data";
import { ProfileView } from "@/components/app/profile-view";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Student } from "@/lib/types";

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const me = useStore((s) => s.me);

  const [student, setStudent] = React.useState<Student | null>(
    me && me.id === id ? me : null,
  );
  const [loading, setLoading] = React.useState(() => !(me && me.id === id));

  React.useEffect(() => {
    if (me && me.id === id) {
      setStudent(me);
      setLoading(false);
      return undefined;
    }
    const numeric = /^[0-9]+$/.test(id);
    if (!numeric) {
      setStudent(mockStudents.find((s) => s.id === id) ?? null);
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/users/${id}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if ((data.ok as boolean) === true && data.student) {
          setStudent(data.student as Student);
        } else {
          setStudent(mockStudents.find((s) => s.id === id) ?? null);
        }
      } catch {
        if (alive)
          setStudent(mockStudents.find((s) => s.id === id) ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [me, id]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  if (!student) {
    return (
      <EmptyState
        title="Student not found"
        description="This profile may have been removed or never existed."
        action={
          <Link href="/discover">
            <Button>Back to discover</Button>
          </Link>
        }
      />
    );
  }

  const isMe = !!me && me.id === student.id;

  return (
    <div className="space-y-4">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to discover
      </Link>
      <ProfileView student={student} isMe={isMe} />
    </div>
  );
}
