"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const me = useStore((s) => s.me);
  const sessionChecked = useStore((s) => s.sessionChecked);
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    useStore.getState().refreshSession().catch(() => null);
  }, [hydrated]);

  React.useEffect(() => {
    if (!hydrated || !sessionChecked) return;
    if (me) return;
    router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
  }, [hydrated, sessionChecked, me, router, pathname]);

  if (!hydrated || !sessionChecked || !me) {
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
