import { NextResponse } from "next/server";
import { departments } from "@/lib/catalog";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import {
  isHandleTaken,
  loadStudent,
  patchProfileDb,
} from "@/server/user-repository";
import type { Faculty } from "@/lib/types";
import { profilePatchSchema } from "@/server/validation";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const uid = getSessionUserIdFromCookies();
  if (uid == null) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = profilePatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message:
          parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ") ||
          "Invalid data",
      },
      { status: 400 },
    );
  }

  const b = parsed.data;

  try {
    const pool = getPool();

    if (b.handle && (await isHandleTaken(pool, b.handle, uid))) {
      return NextResponse.json(
        {
          ok: false,
          code: "handle-taken",
          message: "This handle is already taken.",
        },
        { status: 409 },
      );
    }

    let facultyDerived: Faculty | undefined;
    if (b.faculty != null) {
      facultyDerived = b.faculty;
    }
    if (b.department != null && facultyDerived == null) {
      facultyDerived = departments.find((d) => d.code === b.department)
        ?.faculty as Faculty | undefined;
    }

    const empt = (s: string | null | undefined) => {
      if (s == null) return null;
      const t = s.trim();
      return t.length ? t : null;
    };

    await patchProfileDb(pool, uid, {
      handle: b.handle,
      display_name: b.name,
      department: b.department,
      faculty: facultyDerived ?? undefined,
      semester:
        typeof b.semester === "number" ? b.semester : undefined,
      bio: b.bio,
      vibe: b.vibe,
      isMentor: b.isMentor,
      github:
        b.github !== undefined ? empt(b.github) : undefined,
      linkedin:
        b.linkedin !== undefined ? empt(b.linkedin) : undefined,
      website:
        b.website !== undefined ? empt(b.website) : undefined,
      skills: b.skills,
      interests: b.interests,
      openTo: b.openTo,
      enrollments: b.courseEnrollments,
      projects: b.projects,
      achievements: b.achievements,
    });

    const student = await loadStudent(pool, uid);
    if (!student)
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      student,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500 },
    );
  }
}
