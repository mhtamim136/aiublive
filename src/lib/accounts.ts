"use client";

import { generateSalt, hashPassword, verifyPassword } from "./crypto";
import type { Student } from "./types";

const STORAGE_KEY = "aiub-live-accounts-v1";
const LOGIN_ATTEMPT_LIMIT = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export type AccountRecord = {
  /** Canonical student ID, e.g. 22-12345-1 (stored unmasked locally only) */
  studentId: string;
  /** Lowercased handle, used to enforce handle uniqueness across accounts */
  handle: string;
  /** Display name, used for display only (not authentication) */
  name: string;
  /** Random salt (base64) */
  salt: string;
  /** PBKDF2-SHA256 hash (base64) of password+salt */
  hash: string;
  /** ms since epoch when the password was last changed */
  passwordUpdatedAt: number;
  /** Recent failed-login attempt timestamps (ms since epoch) */
  failedAttempts: number[];
  /** ms since epoch — if in future, login is locked */
  lockedUntil: number | null;
  /** ms since epoch the account was created */
  createdAt: number;
  /** Snapshot of profile fields to restore on login */
  profile: Student;
};

type AccountsBlob = Record<string, AccountRecord>;

function isBrowser() {
  return typeof window !== "undefined";
}

function readBlob(): AccountsBlob {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeBlob(blob: AccountsBlob) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch {
    // ignore quota errors
  }
}

function normaliseId(id: string) {
  return id.trim().toUpperCase();
}

export function listAccounts(): AccountRecord[] {
  return Object.values(readBlob());
}

export function hasAnyAccount(): boolean {
  return Object.keys(readBlob()).length > 0;
}

export function findAccount(studentId: string): AccountRecord | null {
  const blob = readBlob();
  return blob[normaliseId(studentId)] ?? null;
}

export function findAccountByHandle(handle: string): AccountRecord | null {
  const target = handle.trim().toLowerCase();
  return listAccounts().find((a) => a.handle === target) ?? null;
}

export type SignupInput = {
  studentId: string;
  password: string;
  profile: Student;
};

export type SignupResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; code: "id-taken" | "handle-taken" | "weak-password" | "invalid-id"; message: string };

const STUDENT_ID_REGEX = /^\d{2}-\d{5}-\d$/;

export async function createAccount(
  input: SignupInput,
): Promise<SignupResult> {
  const sid = normaliseId(input.studentId);

  if (!STUDENT_ID_REGEX.test(sid)) {
    return {
      ok: false,
      code: "invalid-id",
      message: "Student ID must look like 22-12345-1.",
    };
  }

  const blob = readBlob();
  if (blob[sid]) {
    return {
      ok: false,
      code: "id-taken",
      message:
        "An account already exists with this AIUB student ID on this device. Sign in instead.",
    };
  }

  const handleLower = input.profile.handle.trim().toLowerCase();
  const handleClash = Object.values(blob).find((a) => a.handle === handleLower);
  if (handleClash) {
    return {
      ok: false,
      code: "handle-taken",
      message: "This handle is taken on this device. Pick another.",
    };
  }

  if (input.password.length < 8) {
    return {
      ok: false,
      code: "weak-password",
      message: "Password must be at least 8 characters.",
    };
  }

  const salt = generateSalt();
  const hash = await hashPassword(input.password, salt);
  const now = Date.now();

  const account: AccountRecord = {
    studentId: sid,
    handle: handleLower,
    name: input.profile.name,
    salt,
    hash,
    passwordUpdatedAt: now,
    failedAttempts: [],
    lockedUntil: null,
    createdAt: now,
    profile: input.profile,
  };

  blob[sid] = account;
  writeBlob(blob);

  return { ok: true, account };
}

export type LoginResult =
  | { ok: true; account: AccountRecord }
  | {
      ok: false;
      code: "no-account" | "wrong-password" | "locked";
      message: string;
      lockedUntil?: number;
      remainingAttempts?: number;
    };

export async function attemptLogin(
  studentIdRaw: string,
  password: string,
): Promise<LoginResult> {
  const sid = normaliseId(studentIdRaw);
  const blob = readBlob();
  const account = blob[sid];

  if (!account) {
    // Generic to avoid leaking which IDs exist (tiny anti-enumeration measure).
    return {
      ok: false,
      code: "no-account",
      message:
        "We couldn't find an account with that ID and password on this device.",
    };
  }

  const now = Date.now();

  if (account.lockedUntil && account.lockedUntil > now) {
    return {
      ok: false,
      code: "locked",
      message: "Too many failed attempts. Try again in a few minutes.",
      lockedUntil: account.lockedUntil,
    };
  }

  const ok = await verifyPassword(password, account.salt, account.hash);

  if (!ok) {
    // Prune attempts older than the window
    const recent = account.failedAttempts.filter(
      (t) => now - t < ATTEMPT_WINDOW_MS,
    );
    recent.push(now);
    account.failedAttempts = recent;

    if (recent.length >= LOGIN_ATTEMPT_LIMIT) {
      account.lockedUntil = now + LOCKOUT_MS;
      account.failedAttempts = [];
      blob[sid] = account;
      writeBlob(blob);
      return {
        ok: false,
        code: "locked",
        message:
          "Too many failed attempts. Account temporarily locked for 5 minutes.",
        lockedUntil: account.lockedUntil,
      };
    }

    blob[sid] = account;
    writeBlob(blob);
    const remainingAttempts = LOGIN_ATTEMPT_LIMIT - recent.length;
    return {
      ok: false,
      code: "wrong-password",
      message:
        "We couldn't find an account with that ID and password on this device.",
      remainingAttempts,
    };
  }

  // Success — clear failure state
  account.failedAttempts = [];
  account.lockedUntil = null;
  blob[sid] = account;
  writeBlob(blob);

  return { ok: true, account };
}

/** Update the live profile snapshot for the given account (after edits). */
export function updateAccountProfile(profile: Student) {
  const blob = readBlob();
  // The account is keyed by full ID; we may only know the masked one from
  // the profile. Match by handle (which we keep unique per device).
  const target = Object.values(blob).find(
    (a) => a.handle === profile.handle.toLowerCase(),
  );
  if (!target) return;
  target.profile = profile;
  target.name = profile.name;
  blob[target.studentId] = target;
  writeBlob(blob);
}

export type ChangePasswordResult =
  | { ok: true }
  | {
      ok: false;
      code: "no-account" | "wrong-current" | "weak-new" | "same-as-current";
      message: string;
    };

export async function changePassword(
  studentIdRaw: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const sid = normaliseId(studentIdRaw);
  const blob = readBlob();
  const account = blob[sid];

  if (!account)
    return { ok: false, code: "no-account", message: "Account not found." };

  const currentOk = await verifyPassword(
    currentPassword,
    account.salt,
    account.hash,
  );
  if (!currentOk)
    return {
      ok: false,
      code: "wrong-current",
      message: "Current password is incorrect.",
    };

  if (newPassword.length < 8)
    return {
      ok: false,
      code: "weak-new",
      message: "New password must be at least 8 characters.",
    };

  const sameAsOld = await verifyPassword(
    newPassword,
    account.salt,
    account.hash,
  );
  if (sameAsOld)
    return {
      ok: false,
      code: "same-as-current",
      message: "New password must be different from your current password.",
    };

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  account.salt = newSalt;
  account.hash = newHash;
  account.passwordUpdatedAt = Date.now();
  blob[sid] = account;
  writeBlob(blob);

  return { ok: true };
}

/** Permanently delete an account from this device. */
export function deleteAccount(studentIdRaw: string) {
  const sid = normaliseId(studentIdRaw);
  const blob = readBlob();
  delete blob[sid];
  writeBlob(blob);
}
