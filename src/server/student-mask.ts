export function maskStudentId(norm: string): string {
  const m = /^(\d{2})-(\d{5})-(\d)$/.exec(norm);
  if (!m) return norm;
  return `${m[1]}-XXXXX-${m[3]}`;
}

export function normalizeStudentId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export const STUDENT_ID_REGEX = /^\d{2}-\d{5}-\d$/;
