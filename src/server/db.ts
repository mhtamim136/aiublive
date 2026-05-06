import { Pool, types } from "pg";
import { pgConfig } from "./env";

// `pg` returns BIGINT (OID 20) as a string by default to preserve precision.
// Our user/post ids fit in a JS safe-integer range, so coerce to number once
// here so callers can rely on numeric ids without `Number(row.id)` everywhere.
types.setTypeParser(types.builtins.INT8, (val) => Number(val));

const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
};

export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    const cfg = pgConfig();
    const pool = new Pool({
      ...cfg,
      // Keep TCP sockets warm so we don't pay a fresh handshake for every
      // request on a long-running server (huge win on Vercel/Neon).
      keepAlive: true,
      // Hold idle clients open longer than the default 10 s — Neon keeps
      // the compute warm for ~5 min after the last query, so a 30 s idle
      // timeout means each function instance pays at most one connection
      // per warm window.
      idleTimeoutMillis: 30_000,
      // Bound the worst case if Neon's compute is suspended on cold start.
      connectionTimeoutMillis: 10_000,
    });

    // Neon can drop sockets when it auto-suspends; without a listener those
    // surface as unhandled "Connection terminated unexpectedly" errors that
    // crash the Node process. Logging is enough — the next acquire will
    // open a fresh client transparently.
    pool.on("error", (err) => {
      console.error("[pg pool] idle client error:", err.message);
    });

    globalForDb.__pgPool = pool;
  }
  return globalForDb.__pgPool;
}
