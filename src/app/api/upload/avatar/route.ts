import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getPool } from "@/server/db";
import { getSessionUserIdFromCookies } from "@/server/session-cookie";
import { loadStudent, setAvatarPath } from "@/server/user-repository";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 2_500_000;

const extFromMime = (mime: string) =>
  mime === "image/jpeg" ? ".jpg"
  : mime === "image/png" ? ".png"
  : mime === "image/webp" ? ".webp"
  : mime === "image/gif" ? ".gif"
  : "";

export async function POST(req: Request) {
  const uid = getSessionUserIdFromCookies();
  if (uid == null) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = fd.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Missing avatar file field" },
      { status: 400 },
    );
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unsupported image type. Use JPG, PNG, WebP or GIF.",
      },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Image too large (max ~2.5 MB)." },
      { status: 413 },
    );
  }

  const ext = extFromMime(file.type);
  if (!ext)
    return NextResponse.json({ ok: false, message: "Bad file type" }, { status: 400 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const name = `u${uid}_${Date.now()}${ext}`;
    const rel = `uploads/avatars/${name}`;
    const full = path.join(process.cwd(), "public", rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buf);

    const pool = getPool();
    await setAvatarPath(pool, uid, rel);

    const student = await loadStudent(pool, uid);
    return NextResponse.json({
      ok: true,
      profileImageUrl: student?.profileImageUrl ?? `/${rel}`,
      student,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, message: "Could not save file" },
      { status: 500 },
    );
  }
}
