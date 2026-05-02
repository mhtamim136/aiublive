"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { hasAnyAccount } from "@/lib/accounts";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const me = useStore((s) => s.me);
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || me) return;
    // Not signed in. Decide where to send them.
    const accountExists = hasAnyAccount();
    const dest = accountExists
      ? `/login?next=${encodeURIComponent(pathname || "/dashboard")}`
      : "/onboarding";
    router.replace(dest);
  }, [hydrated, me, router, pathname]);

  if (!hydrated || !me) {
    return <Loading />;
  }

  return <>{children}</>;
}

function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm">Loading your campus…</p>
      </div>
    </div>
  );
}
