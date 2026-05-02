import type { Student } from "./types";
import { matchScore, rankBy } from "./match";
import { mockStudents } from "./mock-data";
import { getCourse } from "./catalog";

export type AppNotification = {
  id: string;
  kind: "match" | "course" | "project" | "mentor" | "system";
  title: string;
  body: string;
  href: string;
  at: string; // ISO
  meta?: { studentId?: string; code?: string };
};

/**
 * Build a deterministic but personalised notification feed for the current user.
 * In a real backend these would be server-generated; here we synthesise them
 * from the mock dataset based on the user's profile.
 */
export function buildNotifications(me: Student): AppNotification[] {
  const out: AppNotification[] = [];
  const now = Date.now();

  const ranked = rankBy(mockStudents, (s) => matchScore(me, s)).filter(
    (r) => r.score > 0,
  );

  // 1. Top 2 daily smart-matches
  ranked.slice(0, 2).forEach((r, i) => {
    const s = r.item;
    const sharedCourse = me.currentCourses.find((c) =>
      s.currentCourses.includes(c),
    );
    out.push({
      id: `match_${s.id}`,
      kind: "match",
      title: `New match · ${s.name}`,
      body: sharedCourse
        ? `Both of you are taking ${sharedCourse} this semester.`
        : `${s.skills.slice(0, 2).join(" · ")} — sounds like your kind of person.`,
      href: `/profile/${s.id}`,
      at: new Date(now - (15 + i * 40) * 60 * 1000).toISOString(),
      meta: { studentId: s.id },
    });
  });

  // 2. Coursemate count for each of your courses (one notification, the busiest)
  if (me.currentCourses.length > 0) {
    const counts = me.currentCourses.map((code) => ({
      code,
      count: mockStudents.filter(
        (s) => s.id !== me.id && s.currentCourses.includes(code),
      ).length,
    }));
    counts.sort((a, b) => b.count - a.count);
    const top = counts[0];
    if (top && top.count > 0) {
      const c = getCourse(top.code);
      out.push({
        id: `course_${top.code}`,
        kind: "course",
        title: `${top.count} classmates in ${c?.title ?? top.code}`,
        body: `Tap to see who else is taking ${top.code} this semester.`,
        href: `/coursemates?code=${encodeURIComponent(top.code)}`,
        at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
        meta: { code: top.code },
      });
    }
  }

  // 3. Mentor available (if user is junior-ish and there are mentors)
  const mentor = mockStudents.find(
    (s) =>
      s.id !== me.id &&
      s.isMentor &&
      s.department === me.department &&
      s.semester > me.semester,
  );
  if (mentor) {
    out.push({
      id: `mentor_${mentor.id}`,
      kind: "mentor",
      title: `${mentor.name.split(" ")[0]} is open to mentor`,
      body: `A senior in ${mentor.department} (${mentor.skills[0]}, ${mentor.skills[1]}) is available this week.`,
      href: `/profile/${mentor.id}`,
      at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      meta: { studentId: mentor.id },
    });
  }

  // 4. Open project that fits your skills
  // (We can't import store here without a circular dep, so just point to /projects.)
  out.push({
    id: `project_open`,
    kind: "project",
    title: "New open project teams",
    body: "Hackathon teams and capstone groups are looking for teammates this week.",
    href: "/projects",
    at: new Date(now - 22 * 60 * 60 * 1000).toISOString(),
  });

  // 5. System welcome
  out.push({
    id: `system_welcome`,
    kind: "system",
    title: "Welcome to AIUB Live",
    body: "Your campus identity is live. Add a project or two to show what you've built.",
    href: "/profile/me",
    at: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
  });

  return out;
}
