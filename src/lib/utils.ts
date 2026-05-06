import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { avatarUrlForId } from "@/lib/avatars";
import type { CourseEnrollment, Student } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarUrl(seed: string) {
  const safe = encodeURIComponent(seed || "aiub");
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${safe}&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Avatar precedence:
 *   1. predefined avatar id (m1..f3) → DiceBear URL from PREDEFINED_AVATARS
 *   2. legacy uploaded image path on `profileImageUrl`
 *   3. Dicebear seeded by handle (default fallback)
 */
export function resolveStudentAvatar(
  student: Pick<Student, "handle" | "profileImageUrl" | "avatarId">,
) {
  const fromId = avatarUrlForId(student.avatarId ?? null);
  if (fromId) return fromId;
  const u = student.profileImageUrl?.trim();
  if (u)
    return u.startsWith("http") || u.startsWith("/") ? u : `/${u.replace(/^\/+/, "")}`;
  return avatarUrl(student.handle);
}

export function studentEnrollments(student: Student): CourseEnrollment[] {
  if (student.courseEnrollments?.length) return student.courseEnrollments;
  return student.currentCourses.map((courseCode) => ({
    courseCode,
    section: "A",
  }));
}

export function sectionForCourse(student: Student, courseCode: string) {
  return (
    studentEnrollments(student).find(
      (e) => e.courseCode === courseCode,
    )?.section ?? ""
  );
}

export function formatRelativeTime(date: Date | string | number) {
  const d = new Date(date).getTime();
  const diff = Date.now() - d;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(d).toLocaleDateString();
}
