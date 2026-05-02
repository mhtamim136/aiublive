import jwt from "jsonwebtoken";
import { env } from "./env";

export const SESSION_COOKIE_NAME = "aiub_session";

function secret(): string {
  return env("JWT_SECRET");
}

export function signSessionToken(userId: number): string {
  const days = Number(env("JWT_EXPIRES_DAYS", "7"));
  return jwt.sign({ sub: String(userId) }, secret(), {
    expiresIn: `${days}d`,
  });
}

export function verifySessionToken(
  token: string | undefined,
): { userId: number } | null {
  if (!token) return null;
  try {
    const d = jwt.verify(token, secret()) as jwt.JwtPayload;
    const sub = d?.sub ? String(d.sub) : "";
    const id = Number.parseInt(sub, 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { userId: id };
  } catch {
    return null;
  }
}
