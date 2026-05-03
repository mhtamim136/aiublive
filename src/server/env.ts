import type { PoolConfig } from "pg";

export function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v != null && v !== "") return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

/**
 * Build the connection options for `new Pool(...)` from `pg`.
 *
 * Preference order:
 *   1. `DATABASE_URL` — single connection string (Neon, Supabase, Render, …).
 *      SSL is enabled with `rejectUnauthorized: false` because most managed
 *      PostgreSQL providers issue certs that aren't in Node's trust store.
 *   2. Discrete `PG*` vars — used for local dev. Set `PGSSL=true` to force TLS.
 */
export function pgConfig(): PoolConfig {
  const url = process.env.DATABASE_URL;
  if (url && url.trim()) {
    return {
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 10,
    };
  }

  const sslEnabled = process.env.PGSSL === "true";
  return {
    host: env("PGHOST", "localhost"),
    port: Number(env("PGPORT", "5432")),
    user: env("PGUSER", "postgres"),
    password: env("PGPASSWORD", ""),
    database: env("PGDATABASE", "aiub_live"),
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    max: 10,
  };
}
