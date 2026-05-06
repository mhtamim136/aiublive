import { z } from "zod";

const COMMON_PASSWORDS = new Set(
  [
    "password",
    "password123",
    "qwerty123",
    "12345678",
    "admin123",
    "aiub2026",
    "student123",
  ].map((s) => s.toLowerCase()),
);

export const departmentEnum = z.enum([
  "CSE",
  "CS",
  "EEE",
  "BBA",
  "Architecture",
  "Civil",
  "English",
  "Economics",
  "Media",
]);

export const facultyEnum = z.enum(["FST", "FBA", "FEA", "FAH"]);

export const opennessLabel = z.enum([
  "Study Partners",
  "Project Teammates",
  "Mentorship",
  "Casual Chat",
]);

export function passwordSchema(ctx?: {
  name?: string;
  handle?: string;
  studentId?: string;
}) {
  const personal = [
    ctx?.name,
    ctx?.handle,
    ctx?.studentId,
    ctx?.studentId?.replace(/-/g, ""),
    "aiub",
  ]
    .filter((s): s is string => !!s && s.length >= 3)
    .map((s) => s.toLowerCase());

  return z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Need one uppercase letter")
    .regex(/[a-z]/, "Need one lowercase letter")
    .regex(/\d/, "Need one digit")
    .regex(/[^A-Za-z0-9]/, "Need one symbol")
    .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), {
      message: "Password too common",
    })
    .refine(
      (p) =>
        personal.every((t) => !p.toLowerCase().includes(t.toLowerCase())),
      { message: "Password contains personal info" },
    );
}

export const courseCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(24)
  .regex(/^[A-Z0-9]+$/);

export const sectionSchema = z
  .string()
  .trim()
  .min(1)
  .max(16)
  .regex(/^[A-Za-z0-9._~-]+$/);

export const enrollmentSchema = z.object({
  courseCode: courseCodeSchema,
  section: sectionSchema,
});

export const signupPayloadSchema = z.object({
  studentId: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .refine((s) => /^\d{2}-\d{5}-\d$/.test(s), "Invalid student ID format"),
  password: z.string().min(1),
  profile: z.object({
    name: z.string().trim().min(2).max(120),
    handle: z
      .string()
      .trim()
      .transform((s) => s.toLowerCase())
      .pipe(z.string().regex(/^[a-z0-9._]{3,32}$/, "Invalid handle")),
    department: departmentEnum,
    faculty: facultyEnum,
    semester: z.number().int().min(1).max(12),
    bio: z.string().max(560).optional().default(""),
    vibe: z.string().max(160).optional().default(""),
    isMentor: z.boolean().optional().default(false),
    github: z.string().max(512).optional(),
    linkedin: z.string().max(512).optional(),
    website: z.string().max(512).optional(),
    skills: z.array(z.string().trim().min(1).max(80)).max(24),
    interests: z.array(z.string().trim().min(1).max(80)).max(24),
    openTo: z.array(opennessLabel).max(8),
    courseEnrollments: z.array(enrollmentSchema).min(1).max(16),
    projects: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          title: z.string().min(1).max(200),
          description: z.string().max(1200),
          tags: z.array(z.string().max(40)).max(16),
          year: z.number().int().min(1990).max(2099),
          link: z.string().max(768).optional(),
        }),
      )
      .max(50)
      .optional()
      .default([]),
    achievements: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          title: z.string().min(1).max(200),
          description: z.string().max(560).optional(),
          year: z.number().int().min(1990).max(2099),
          type: z
            .enum(["academic", "competition", "project", "leadership"])
            .optional()
            .default("academic"),
        }),
      )
      .max(50)
      .optional()
      .default([]),
  }),
});

export type SignupValidated = z.infer<typeof signupPayloadSchema>;

export const profilePatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  courseEnrollments: z.array(enrollmentSchema).max(16).optional(),
  handle: z
    .string()
    .trim()
    .transform((s) => s.toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9._]{3,32}$/))
    .optional(),
  department: departmentEnum.optional(),
  faculty: facultyEnum.optional(),
  semester: z.number().int().min(1).max(12).optional(),
  bio: z.string().max(560).optional(),
  vibe: z.string().max(160).optional(),
  isMentor: z.boolean().optional(),
  avatarId: z.enum(["m1", "m2", "m3", "f1", "f2", "f3"]).nullable().optional(),
  github: z.string().max(512).nullable().optional(),
  linkedin: z.string().max(512).nullable().optional(),
  website: z.string().max(512).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(24).optional(),
  interests: z.array(z.string().trim().min(1).max(80)).max(24).optional(),
  openTo: z.array(opennessLabel).max(8).optional(),
  projects: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        title: z.string().min(1).max(200),
        description: z.string().max(1200),
        tags: z.array(z.string().max(40)).max(16),
        year: z.number().int().min(1990).max(2099),
        link: z.string().max(768).optional(),
      }),
    )
    .max(50)
    .optional(),
  achievements: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        title: z.string().min(1).max(200),
        description: z.string().max(560).optional(),
        year: z.number().int().min(1990).max(2099),
        type: z
          .enum(["academic", "competition", "project", "leadership"])
          .optional(),
      }),
    )
    .max(50)
    .optional(),
});
