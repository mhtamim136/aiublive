import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "./jwt-session";
import { env } from "./env";

function cookieLifetimeSec(): number {
  const days = Number(env("JWT_EXPIRES_DAYS", "7"));
  return Math.max(1, days) * 24 * 60 * 60;
}

export function getSessionUserIdFromCookies(): number | null {
  const jar = cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const v = verifySessionToken(token);
  return v?.userId ?? null;
}

/** Attach JWT session to an outgoing API response (HttpOnly cookie). */
export function attachSessionCookie(res: NextResponse, userId: number) {
  const token = signSessionToken(userId);
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookieLifetimeSec(),
  });
}

export function clearSessionOnResponse(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
