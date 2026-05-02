import { NextResponse } from "next/server";
import { clearSessionOnResponse } from "@/server/session-cookie";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionOnResponse(res);
  return res;
}
