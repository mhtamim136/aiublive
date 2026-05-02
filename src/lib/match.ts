import type { Student } from "./types";

export function overlap<T>(a: T[], b: T[]) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

export function matchScore(me: Student, other: Student) {
  if (me.id === other.id) return 0;
  const sharedCourses = overlap(me.currentCourses, other.currentCourses);
  const sharedSkills = overlap(me.skills, other.skills);
  const sharedInterests = overlap(me.interests, other.interests);
  const sameDept = me.department === other.department ? 1 : 0;
  const sameSemester = me.semester === other.semester ? 1 : 0;

  // Weighted score
  return (
    sharedCourses.length * 12 +
    sharedSkills.length * 6 +
    sharedInterests.length * 4 +
    sameDept * 6 +
    sameSemester * 3
  );
}

export function matchReasons(me: Student, other: Student) {
  const reasons: string[] = [];
  const sc = overlap(me.currentCourses, other.currentCourses);
  if (sc.length) reasons.push(`Both in ${sc.slice(0, 2).join(", ")}`);
  const ss = overlap(me.skills, other.skills);
  if (ss.length)
    reasons.push(
      `Shared skills · ${ss.slice(0, 3).join(", ")}`,
    );
  const si = overlap(me.interests, other.interests);
  if (si.length)
    reasons.push(
      `Common interests · ${si.slice(0, 2).join(", ")}`,
    );
  if (me.department === other.department)
    reasons.push(`Same department · ${other.department}`);
  return reasons;
}

export function rankBy<T>(
  items: T[],
  scorer: (item: T) => number,
): { item: T; score: number }[] {
  return items
    .map((item) => ({ item, score: scorer(item) }))
    .sort((a, b) => b.score - a.score);
}
