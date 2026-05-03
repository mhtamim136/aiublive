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
    globalForDb.__pgPool = new Pool(pgConfig());
  }
  return globalForDb.__pgPool;
}
