export function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v != null && v !== "") return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

export function mysqlConfig() {
  return {
    host: env("MYSQL_HOST", "127.0.0.1"),
    port: Number(env("MYSQL_PORT", "3306")),
    user: env("MYSQL_USER", "root"),
    password: env("MYSQL_PASSWORD", ""),
    database: env("MYSQL_DATABASE", "aiub_live"),
    waitForConnections: true,
    connectionLimit: 10,
  };
}
