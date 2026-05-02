import type { Course, Department, Faculty } from "./types";

export const departments: { code: Department; name: string; faculty: Faculty }[] =
  [
    { code: "CSE", name: "Computer Science & Engineering", faculty: "FST" },
    { code: "CS", name: "Computer Science", faculty: "FST" },
    { code: "EEE", name: "Electrical & Electronic Engineering", faculty: "FEA" },
    { code: "BBA", name: "Business Administration", faculty: "FBA" },
    { code: "Architecture", name: "Architecture", faculty: "FEA" },
    { code: "Civil", name: "Civil Engineering", faculty: "FEA" },
    { code: "English", name: "English", faculty: "FAH" },
    { code: "Economics", name: "Economics", faculty: "FAH" },
    { code: "Media", name: "Media & Mass Communication", faculty: "FAH" },
  ];

// Student progression semesters (1st through 12th).
// AIUB BSc programs are 8-semester curricula; we allow up to 12 to cover
// extensions. 12+ is treated as "Graduate / Beyond".
export const semesterNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatSemester(n: number) {
  if (n >= 12) return "Graduate";
  return `${ordinal(n)} semester`;
}

export function deriveLevel(
  semester: number,
): "Freshman" | "Sophomore" | "Junior" | "Senior" | "Graduate" {
  if (semester <= 2) return "Freshman";
  if (semester <= 4) return "Sophomore";
  if (semester <= 6) return "Junior";
  if (semester <= 8) return "Senior";
  return "Graduate";
}

export const skillSuggestions = [
  "React", "Next.js", "TypeScript", "Python", "Java", "C++", "Node.js",
  "Machine Learning", "Data Science", "Pandas", "TensorFlow", "PyTorch",
  "UI/UX Design", "Figma", "Photoshop", "Illustrator", "After Effects",
  "MongoDB", "PostgreSQL", "MySQL", "Firebase", "AWS", "Docker",
  "Git", "GitHub Actions", "Tailwind", "Flutter", "React Native",
  "Public Speaking", "Content Writing", "Video Editing", "3D Modeling",
  "Microcontrollers", "PCB Design", "MATLAB", "AutoCAD", "Revit",
  "Financial Modeling", "Marketing", "SEO", "Photography",
];

export const interestSuggestions = [
  "Hackathons", "Startups", "AI Research", "Open Source", "Robotics",
  "Cybersecurity", "Web Development", "Mobile Apps", "Game Dev",
  "Design Systems", "Filmmaking", "Music Production", "Esports",
  "Debate", "Volunteering", "Entrepreneurship", "Investing", "Reading",
  "Photography", "Fitness", "Chess", "Anime", "Cricket", "Football",
];

export const opennessOptions = [
  "Study Partners",
  "Project Teammates",
  "Mentorship",
  "Casual Chat",
] as const;

/**
 * Official AIUB course catalog — sourced from the FST Undergraduate Course
 * Catalog (https://www.aiub.edu/faculties/fst/ug-course-catalog).
 *
 * Codes follow the official format, e.g. CSC1102, MAT1205, COE3101.
 * `department` indicates the home department for the course; courses
 * shared across programs (MAT, PHY, ENG, etc.) are tagged with their
 * primary academic home.
 */
export const courses: Course[] = [
  // ── CSC: Computer Science (CSE Core)
  { code: "CSC1101", title: "Introduction to Computer Studies", department: "CSE", credits: 1 },
  { code: "CSC1102", title: "Introduction to Programming Language", department: "CSE", credits: 3 },
  { code: "CSC1103", title: "Introduction to Programming Language Lab", department: "CSE", credits: 1 },
  { code: "CSC1204", title: "Discrete Mathematics", department: "CSE", credits: 3 },
  { code: "CSC1205", title: "Object Oriented Programming 1", department: "CSE", credits: 3 },
  { code: "CSC2106", title: "Data Structure", department: "CSE", credits: 3 },
  { code: "CSC2107", title: "Data Structure Lab", department: "CSE", credits: 1 },
  { code: "CSC2108", title: "Introduction to Database", department: "CSE", credits: 3 },
  { code: "CSC2209", title: "Object Oriented Analysis and Design", department: "CSE", credits: 3 },
  { code: "CSC2210", title: "Object Oriented Programming 2", department: "CSE", credits: 3 },
  { code: "CSC2211", title: "Algorithms", department: "CSE", credits: 3 },
  { code: "CSC3112", title: "Software Engineering", department: "CSE", credits: 3 },
  { code: "CSC3113", title: "Theory of Computation", department: "CSE", credits: 3 },
  { code: "CSC3214", title: "Operating Systems", department: "CSE", credits: 3 },
  { code: "CSC3215", title: "Web Technologies", department: "CSE", credits: 3 },
  { code: "CSC3216", title: "Compiler Design", department: "CSE", credits: 3 },
  { code: "CSC3217", title: "Artificial Intelligence and Expert Systems", department: "CSE", credits: 3 },
  { code: "CSC4118", title: "Computer Graphics", department: "CSE", credits: 3 },
  { code: "CSC4197", title: "Research Methodology", department: "CSE", credits: 3 },
  { code: "CSC4298", title: "Thesis / Project", department: "CSE", credits: 6 },
  { code: "CSC4299", title: "Internship", department: "CSE", credits: 3 },

  // ── CSC: Electives
  { code: "CSC4125", title: "Computer Science Mathematics", department: "CSE", credits: 3 },
  { code: "CSC4126", title: "Basic Graph Theory", department: "CSE", credits: 3 },
  { code: "CSC4127", title: "Advanced Algorithm Techniques", department: "CSE", credits: 3 },
  { code: "CSC4128", title: "Linear Programming", department: "CSE", credits: 3 },
  { code: "CSC4144", title: "Multimedia Systems", department: "CSE", credits: 3 },
  { code: "CSC4160", title: "Software Requirement Engineering", department: "CSE", credits: 3 },
  { code: "CSC4180", title: "Introduction to Data Science", department: "CSE", credits: 3 },
  { code: "CSC4181", title: "Advance Database Management Systems", department: "CSE", credits: 3 },
  { code: "CSC4182", title: "Human Computer Interaction", department: "CSE", credits: 3 },
  { code: "CSC4183", title: "Cyber Laws & Information Security", department: "CSE", credits: 3 },
  { code: "CSC4230", title: "Bioinformatics", department: "CSE", credits: 3 },
  { code: "CSC4231", title: "Parallel Computing", department: "CSE", credits: 3 },
  { code: "CSC4232", title: "Machine Learning", department: "CSE", credits: 3 },
  { code: "CSC4233", title: "Natural Language Processing", department: "CSE", credits: 3 },
  { code: "CSC4251", title: "Image Processing", department: "CSE", credits: 3 },
  { code: "CSC4254", title: "Computer Vision & Pattern Recognition", department: "CSE", credits: 3 },
  { code: "CSC4261", title: "Advanced Programming in Web Technologies", department: "CSE", credits: 3 },
  { code: "CSC4262", title: "Programming in Python", department: "CSE", credits: 3 },
  { code: "CSC4263", title: "Advanced Programming with JAVA", department: "CSE", credits: 3 },
  { code: "CSC4264", title: "Advanced Programming with .NET", department: "CSE", credits: 3 },
  { code: "CSC4270", title: "Software Development Project Management", department: "CSE", credits: 3 },
  { code: "CSC4271", title: "Software Quality and Testing", department: "CSE", credits: 3 },
  { code: "CSC4272", title: "Mobile Application Development", department: "CSE", credits: 3 },
  { code: "CSC4273", title: "Software Architecture & Design Patterns", department: "CSE", credits: 3 },
  { code: "CSC4285", title: "Data Warehouse and Data Mining", department: "CSE", credits: 3 },

  // ── COE: Computer / Communication Engineering (cross-listed in CSE)
  { code: "COE3101", title: "Data Communication", department: "CSE", credits: 3 },
  { code: "COE3102", title: "Microprocessor and Embedded Systems", department: "CSE", credits: 3 },
  { code: "COE3203", title: "Computer Organization & Architecture", department: "CSE", credits: 3 },
  { code: "COE3204", title: "Computer Networks", department: "CSE", credits: 3 },
  { code: "COE4140", title: "Advanced Operating Systems", department: "CSE", credits: 3 },
  { code: "COE4141", title: "Advanced Computer Networks", department: "CSE", credits: 3 },
  { code: "COE4142", title: "Network Resource Management & Organization", department: "CSE", credits: 3 },
  { code: "COE4143", title: "Digital System Design", department: "CSE", credits: 3 },
  { code: "COE4250", title: "Simulation and Modelling", department: "CSE", credits: 3 },
  { code: "COE4252", title: "Network Security", department: "CSE", credits: 3 },
  { code: "COE4253", title: "Wireless Sensor Network", department: "CSE", credits: 3 },
  { code: "COE4255", title: "Robotics Engineering", department: "CSE", credits: 3 },

  // ── EEE: Electrical & Electronic Engineering
  { code: "EEE2101", title: "Basic Mechanical Engineering", department: "EEE", credits: 3 },
  { code: "EEE2103", title: "Electronic Devices", department: "EEE", credits: 3 },
  { code: "EEE2104", title: "Electronic Devices Lab", department: "EEE", credits: 1 },
  { code: "EEE2108", title: "Introduction to Electrical Circuits", department: "EEE", credits: 3 },
  { code: "EEE2109", title: "Introduction to Electrical Circuits Lab", department: "EEE", credits: 1 },
  { code: "EEE2213", title: "Signals and Linear Systems", department: "EEE", credits: 3 },
  { code: "EEE2216", title: "Engineering Ethics", department: "EEE", credits: 3 },
  { code: "EEE3101", title: "Digital Logic and Circuits", department: "EEE", credits: 3 },
  { code: "EEE3102", title: "Digital Logic and Circuits Lab", department: "EEE", credits: 1 },
  { code: "EEE3103", title: "Digital Signal Processing", department: "EEE", credits: 3 },
  { code: "EEE4209", title: "Telecommunications Engineering", department: "EEE", credits: 3 },
  { code: "EEE4217", title: "VLSI Circuit Design", department: "EEE", credits: 3 },
  { code: "EEE4233", title: "Digital Design with System Verilog, VHDL & FPGAs", department: "EEE", credits: 3 },
  { code: "EEE4241", title: "Industrial Electronics, Drives & Instrumentation", department: "EEE", credits: 3 },

  // ── MAT: Mathematics
  { code: "MAT1102", title: "Differential Calculus and Coordinate Geometry", department: "CSE", credits: 3 },
  { code: "MAT1205", title: "Integral Calculus and Ordinary Differential Equations", department: "CSE", credits: 3 },
  { code: "MAT2101", title: "Complex Variables, Laplace and Z-Transformations", department: "CSE", credits: 3 },
  { code: "MAT2202", title: "Matrices, Vectors and Fourier Analysis", department: "CSE", credits: 3 },
  { code: "MAT3101", title: "Numerical Methods for Science and Engineering", department: "CSE", credits: 3 },
  { code: "MAT3103", title: "Computational Statistics and Probability", department: "CSE", credits: 3 },

  // ── PHY: Physics
  { code: "PHY1101", title: "Physics 1", department: "CSE", credits: 3 },
  { code: "PHY1102", title: "Physics 1 Lab", department: "CSE", credits: 1 },
  { code: "PHY1203", title: "Physics 2", department: "CSE", credits: 3 },
  { code: "PHY1204", title: "Physics 2 Lab", department: "CSE", credits: 1 },

  // ── CHEM: Chemistry
  { code: "CHEM1101", title: "Chemistry", department: "CSE", credits: 3 },

  // ── ENG: Language
  { code: "ENG1101", title: "English Reading Skills and Public Speaking", department: "English", credits: 3 },
  { code: "ENG1202", title: "English Writing Skills and Communication", department: "English", credits: 3 },
  { code: "ENG2103", title: "Business Communication", department: "English", credits: 3 },

  // ── BAS / BAE
  { code: "BAS2101", title: "Bangladesh Studies", department: "English", credits: 3 },
  { code: "BAE2101", title: "Computer Aided Design & Drafting Lab", department: "Architecture", credits: 1 },

  // ── BBA / MGT / ECO
  { code: "BBA1102", title: "Principles of Accounting", department: "BBA", credits: 3 },
  { code: "MGT3202", title: "Engineering Management", department: "BBA", credits: 3 },
  { code: "ECO3150", title: "Principles of Economics", department: "Economics", credits: 3 },

  // ── MIS: Management Information Systems
  { code: "MIS3101", title: "Management Information Systems", department: "BBA", credits: 3 },
  { code: "MIS4007", title: "Digital Marketing", department: "BBA", credits: 3 },
  { code: "MIS4011", title: "Enterprise Resource Planning", department: "BBA", credits: 3 },
  { code: "MIS4012", title: "E-Commerce, E-Governance & E-Series", department: "BBA", credits: 3 },
  { code: "MIS4014", title: "Business Intelligence and Decision Support System", department: "BBA", credits: 3 },
];

export function getCourse(code: string): Course | undefined {
  return courses.find((c) => c.code === code);
}

export function coursesByDepartment(dept: Department): Course[] {
  return courses.filter((c) => c.department === dept);
}

const DEPT_PREFIXES: Record<Department, string[]> = {
  CSE: ["CSC", "COE", "MAT", "PHY", "CHEM", "EEE", "BAS", "BAE", "ENG", "BBA", "ECO", "MGT", "MIS"],
  CS: ["CSC", "COE", "MAT", "ENG", "BAS"],
  EEE: ["EEE", "COE", "MAT", "PHY", "ENG", "BAS", "BAE"],
  BBA: ["BBA", "MGT", "ECO", "MIS", "ENG", "BAS"],
  Architecture: ["BAE", "ENG", "BAS", "PHY"],
  Civil: ["BAE", "PHY", "MAT", "ENG", "BAS"],
  English: ["ENG", "BAS"],
  Economics: ["ECO", "MAT", "ENG", "BAS"],
  Media: ["ENG", "BAS"],
};

/**
 * Search courses by code, title, or any token. Returns ranked results.
 *
 * - With a query: returns the best matches across the entire catalog,
 *   regardless of department, so you can always find what you're typing.
 * - Without a query: returns the courses most relevant to the student's
 *   department first, then everything else.
 */
export function searchCourses(
  query: string,
  options?: { department?: Department; exclude?: string[]; limit?: number },
): Course[] {
  const q = query.trim().toLowerCase();
  const exclude = new Set(options?.exclude ?? []);
  const limit = options?.limit ?? 30;
  const dept = options?.department;
  const allowedPrefixes = dept ? DEPT_PREFIXES[dept] : null;

  const pool = courses.filter((c) => !exclude.has(c.code));

  if (!q) {
    // No query: show department-relevant courses first, then everything else.
    const ranked = pool.map((c) => {
      const prefix = c.code.replace(/[^A-Z]/g, "").slice(0, 4);
      const isRelevant = allowedPrefixes?.includes(prefix) ?? true;
      return { course: c, weight: isRelevant ? 1 : 0 };
    });
    ranked.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.course.code.localeCompare(b.course.code);
    });
    return ranked.slice(0, limit).map((r) => r.course);
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = pool
    .map((c) => {
      const code = c.code.toLowerCase();
      const title = c.title.toLowerCase();
      let score = 0;
      // Strong signals first
      if (code === q) score += 100;
      if (code.startsWith(q)) score += 60;
      if (code.includes(q)) score += 30;
      if (title.startsWith(q)) score += 35;
      if (title.includes(q)) score += 18;
      // Per-token contains
      for (const t of tokens) {
        if (code.includes(t)) score += 6;
        if (title.includes(t)) score += 4;
      }
      // Soft boost for the student's home-department prefixes
      if (allowedPrefixes) {
        const prefix = c.code.replace(/[^A-Z]/g, "").slice(0, 4);
        if (allowedPrefixes.includes(prefix)) score += 2;
      }
      return { course: c, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.course);
}
