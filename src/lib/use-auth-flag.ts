"use client";

import * as React from "react";

/**
 * Lightweight client-side auth flag for the marketing layout.
 *
 * The app routes do their own server-side auth gating; the marketing pages
 * are statically renderable, so we can't depend on cookies during SSR. This
 * hook does a single `/api/auth/me` HEAD-style probe on mount and caches the
 * result on `window` so subsequent components/pages don't re-fetch.
 *
 * It returns `null` while the probe is in flight (so callers can render an
 * unbiased UI during hydration), and `true` / `false` once the answer
 * arrives. Most callers can safely treat `null` as "not yet authed".
 */
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

async function probe(): Promise<boolean> {
  if (cached !== null) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      cached = !!data && data.ok === true;
    } catch {
      cached = false;
    }
    return cached;
  })();
  return inflight;
}

export function useAuthFlag(): boolean {
  const [authed, setAuthed] = React.useState<boolean>(cached ?? false);
  React.useEffect(() => {
    let alive = true;
    probe().then((v) => {
      if (alive) setAuthed(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  return authed;
}
