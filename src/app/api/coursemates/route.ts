import { NextResponse } from "next/server";
import { courseCodeSchema, sectionSchema } from "@/server/validation";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import {
  findUsersInCourseSection,
  loadStudentsBatch,
} from "@/server/user-repository";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const viewer = getSessionUserIdFromCookies();

  try {
    const url = new URL(req.url);
    const courseParsed = courseCodeSchema.safeParse(
      url.searchParams.get("course") ?? "",
    );
    if (!courseParsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid course code", students: [] },
        { status: 400 },
      );
    }

    const sectionRaw = url.searchParams.get("section")?.trim();
    let sectionNormalized: string | null = null;
    if (sectionRaw) {
      const sp = sectionSchema.safeParse(sectionRaw);
      if (!sp.success) {
        return NextResponse.json(
          { ok: false, message: "Invalid section format", students: [] },
          { status: 400 },
        );
      }
      sectionNormalized = sp.data;
    }

    const pool = getPool();
    const ids = await findUsersInCourseSection(pool, {
      courseCode: courseParsed.data.toUpperCase(),
      section: sectionNormalized,
      excludeUserId: viewer != null ? viewer : 0,
    });

    // Single batched read instead of N round trips.
    const students = (await loadStudentsBatch(pool, ids)).filter(
      (s): s is NonNullable<typeof s> => s !== null,
    );

    return NextResponse.json({ ok: true, students });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Lookup failed", students: [] },
      { status: 500 },
    );
  }
}
