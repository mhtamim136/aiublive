export type Department =
  | "CSE"
  | "CS"
  | "EEE"
  | "BBA"
  | "Architecture"
  | "Civil"
  | "English"
  | "Economics"
  | "Media";

export type Faculty =
  | "FST" // Faculty of Science & Technology
  | "FBA" // Faculty of Business Administration
  | "FEA" // Faculty of Engineering
  | "FAH"; // Faculty of Arts & Humanities

export type Course = {
  code: string;
  title: string;
  department: Department;
  credits: number;
};

/** Course + section — used for coursemates vs section mates. */
export type CourseEnrollment = {
  courseCode: string;
  section: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link?: string;
  year: number;
};

export type Achievement = {
  id: string;
  title: string;
  description?: string;
  year: number;
  type: "academic" | "competition" | "project" | "leadership";
};

export type Student = {
  id: string; // app user id (numeric string from DB) or legacy mock ids
  /** Monotonic DB id (#) for display/search — optional on mock personas. */
  userNumber?: number;
  /** One of the predefined avatars (m1..f3). When set, takes precedence over profileImageUrl. */
  avatarId?: import("./avatars").AvatarId | null;
  /** Legacy uploaded avatar path — kept for back-compat with old accounts. */
  profileImageUrl?: string | null;
  name: string;
  handle: string;
  studentIdMasked: string; // e.g., 22-XXXXX-1 (masked)
  department: Department;
  faculty: Faculty;
  semester: number; // student's progression semester (1-12). 12+ = Graduate
  level: "Freshman" | "Sophomore" | "Junior" | "Senior" | "Graduate";
  bio: string;
  vibe: string; // 1-line vibe
  skills: string[];
  interests: string[];
  currentCourses: string[]; // course codes (mirror of enrollments.courseCode)
  /** When present, drives sections for coursemates. */
  courseEnrollments?: CourseEnrollment[];
  projects: Project[];
  achievements: Achievement[];
  openTo: ("Study Partners" | "Project Teammates" | "Mentorship" | "Casual Chat")[];
  isMentor?: boolean;
  /** Explicit graduation flag — semester alone never makes someone Graduate. */
  isGraduate?: boolean;
  links?: { github?: string; linkedin?: string; website?: string };
  joinedAt: string; // ISO date
};

export type ProjectPost = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  skillsWanted: string[];
  rolesNeeded: string[];
  teamSize: number;
  members: string[]; // student ids
  createdAt: string;
  status: "open" | "in-progress" | "closed";
  tags: string[];
};

export type ConnectionStatus = "none" | "pending" | "connected";
