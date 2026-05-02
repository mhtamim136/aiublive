import { NextResponse } from "next/server";

export function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}
