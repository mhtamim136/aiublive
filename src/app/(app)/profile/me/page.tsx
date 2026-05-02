"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Edit3, LogOut } from "lucide-react";
import { useStore } from "@/lib/store";
import { ProfileView } from "@/components/app/profile-view";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ProfileEditor } from "@/components/app/profile-editor";

export default function MyProfilePage() {
  const router = useRouter();
  const me = useStore((s) => s.me);
  const signOut = useStore((s) => s.signOut);
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);

  if (!me) return null;

  if (editing) {
    return (
      <ProfileEditor
        onClose={() => {
          setEditing(false);
          toast({
            kind: "success",
            title: "Profile updated",
            description: "Your changes are live across AIUB Live.",
          });
        }}
      />
    );
  }

  return (
    <ProfileView
      student={me}
      isMe
      rightAction={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Edit3 className="h-4 w-4" />}
            onClick={() => setEditing(true)}
          >
            Edit profile
          </Button>
          <Button
            variant="ghost"
            size="md"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={() => {
              signOut();
              toast({
                kind: "info",
                title: "Signed out",
                description: "Sign back in any time with your AIUB ID.",
              });
              router.replace("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      }
    />
  );
}
