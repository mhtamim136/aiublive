/**
 * Browser-side password hashing using PBKDF2-SHA256 via the Web Crypto API.
 *
 * This is the same primitive used by production auth systems. With 200,000
 * iterations and a per-account 16-byte salt, brute-forcing a single
 * password takes years on commodity hardware even if the hash leaks.
 *
 * NOTE: Real production systems should run this on the server. We hash on
 * the client here because this app has no backend in this build. Salt and
 * hash are stored in localStorage. The user is informed in Settings.
 */

const PBKDF2_ITERATIONS = 200_000;
const HASH_BITS = 256; // 32 bytes
const SALT_BYTES = 16;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateSalt(): string {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

export async function hashPassword(
  password: string,
  saltB64: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBytes = base64ToBytes(saltB64);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      // The TS DOM lib types are picky about ArrayBuffer vs ArrayBufferLike;
      // a buffer-source cast keeps the runtime behaviour identical.
      salt: saltBytes as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    key,
    HASH_BITS,
  );
  return bytesToBase64(new Uint8Array(bits));
}

/**
 * Constant-time string compare. Prevents timing attacks where an attacker
 * could infer characters of the hash by measuring response time.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyPassword(
  password: string,
  saltB64: string,
  expectedHashB64: string,
): Promise<boolean> {
  const got = await hashPassword(password, saltB64);
  return safeEqual(got, expectedHashB64);
}

// ──────────────────────────────────────────────────────────────────────
// Password strength + validation
// ──────────────────────────────────────────────────────────────────────

const COMMON_PASSWORDS = new Set(
  [
    "password",
    "password1",
    "password123",
    "qwerty",
    "qwerty123",
    "12345678",
    "123456789",
    "1234567890",
    "letmein",
    "iloveyou",
    "admin",
    "admin123",
    "welcome",
    "monkey",
    "dragon",
    "abc12345",
    "abc123456",
    "1q2w3e4r",
    "1qaz2wsx",
    "asdf1234",
    "qwerty1234",
    "aiub1234",
    "aiub2024",
    "aiub2025",
    "aiub2026",
    "student1",
    "student123",
    "passw0rd",
    "p@ssw0rd",
    "trustno1",
    "sunshine",
    "princess",
    "football",
    "baseball",
    "shadow",
    "master",
    "michael",
    "jennifer",
    "jordan",
    "superman",
    "harley",
    "ranger",
    "hunter",
    "buster",
    "soccer",
    "hockey",
    "killer",
    "george",
    "andrew",
    "charlie",
    "andrea",
    "joshua",
    "amanda",
    "letmein123",
    "welcome1",
    "qwertyuiop",
    "1234qwer",
    "azerty",
  ].map((s) => s.toLowerCase()),
);

export type PasswordCheck = {
  id: "length" | "upper" | "lower" | "digit" | "special" | "noPersonal" | "notCommon";
  label: string;
  passed: boolean;
};

export type PasswordReport = {
  checks: PasswordCheck[];
  passed: boolean;
  strength: 0 | 1 | 2 | 3 | 4; // 0=very weak, 4=very strong
  strengthLabel: "Empty" | "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
  message?: string;
};

export function evaluatePassword(
  password: string,
  context?: { name?: string; studentId?: string; handle?: string },
): PasswordReport {
  const lower = password.toLowerCase();
  const personalTokens = [
    context?.name,
    context?.handle,
    context?.studentId,
    context?.studentId?.replace(/-/g, ""),
    "aiub",
    "aiublive",
  ]
    .filter((s): s is string => !!s && s.length >= 3)
    .map((s) => s.toLowerCase());

  const containsPersonal = personalTokens.some((t) =>
    lower.includes(t.toLowerCase()),
  );

  const checks: PasswordCheck[] = [
    {
      id: "length",
      label: "At least 8 characters",
      passed: password.length >= 8,
    },
    {
      id: "upper",
      label: "One uppercase letter (A–Z)",
      passed: /[A-Z]/.test(password),
    },
    {
      id: "lower",
      label: "One lowercase letter (a–z)",
      passed: /[a-z]/.test(password),
    },
    { id: "digit", label: "One number (0–9)", passed: /\d/.test(password) },
    {
      id: "special",
      label: "One symbol (!@#$%…)",
      passed: /[^A-Za-z0-9]/.test(password),
    },
    {
      id: "noPersonal",
      label: "Not your name, ID, or handle",
      passed: password.length > 0 && !containsPersonal,
    },
    {
      id: "notCommon",
      label: "Not a common password",
      passed: password.length > 0 && !COMMON_PASSWORDS.has(lower),
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const passed = checks.every((c) => c.passed);

  // Strength score considers length bonuses + character class diversity
  let raw = 0;
  if (password.length >= 8) raw += 1;
  if (password.length >= 12) raw += 1;
  if (password.length >= 16) raw += 1;
  if (/[A-Z]/.test(password)) raw += 1;
  if (/[a-z]/.test(password)) raw += 1;
  if (/\d/.test(password)) raw += 1;
  if (/[^A-Za-z0-9]/.test(password)) raw += 1;
  if (containsPersonal) raw -= 2;
  if (COMMON_PASSWORDS.has(lower)) raw -= 4;
  raw = Math.max(0, raw);

  let strength: 0 | 1 | 2 | 3 | 4 = 0;
  if (password.length === 0) strength = 0;
  else if (raw <= 2) strength = 1;
  else if (raw <= 4) strength = 2;
  else if (raw <= 5) strength = 3;
  else strength = 4;

  const labels = [
    "Empty",
    "Very weak",
    "Weak",
    "Fair",
    "Strong",
    "Very strong",
  ] as const;

  let message: string | undefined;
  if (password.length === 0) message = undefined;
  else if (containsPersonal)
    message = "Avoid using your name, student ID, or handle.";
  else if (COMMON_PASSWORDS.has(lower))
    message = "This password is on a public list of leaked passwords.";

  return {
    checks,
    passed,
    strength,
    // Index 0 corresponds to "Empty" (no password)
    strengthLabel:
      password.length === 0 ? labels[0] : labels[Math.max(1, strength)],
    message,
  };
}
