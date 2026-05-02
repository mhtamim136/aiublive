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

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const me = useStore((s) => s.me);

  // me id can also be looked up
  const student =
    me && me.id === id ? me : mockStudents.find((s) => s.id === id);

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
