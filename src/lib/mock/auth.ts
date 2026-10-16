// Prototype stand-in for Supabase Auth (M3). Server-only: imported from server actions,
// route handlers and server components, never from client components.
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import * as db from "./data";

/** Demo logins. Only accounts whose screens are wired to mock data are listed. */
const ACCOUNTS: { email: string; profileId: string; passwordSha256: Buffer }[] = [
  { email: "amina@example.com", profileId: "t1", passwordSha256: sha256("sabaq-demo") },
  { email: "sara@example.com", profileId: "g1", passwordSha256: sha256("sabaq-demo") },
];

/** Hashed PINs, mirroring students.pin_hash. Every demo child starts with PIN 1234. */
const DEMO_PIN = "1234";

export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCK_MS = 60_000;
export const STUDENT_LINK_TTL_MS = 15 * 60_000;

// Shared across Next's server bundles and dev reloads.
const store = globalThis as typeof globalThis & {
  __lsPins?: Map<string, Buffer>;
  __lsPinFailures?: Map<string, { count: number; lockedUntil: number }>;
  __lsStudentLinks?: Map<string, { studentId: string; expiresAt: number }>;
};
const pinHashes = (store.__lsPins ??= new Map(db.students.map((s) => [s.id, pinHash(s.id, DEMO_PIN)])));
const pinFailures = (store.__lsPinFailures ??= new Map());
const studentLinks = (store.__lsStudentLinks ??= new Map());

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Prototype only: a real PIN hash needs a slow KDF (e.g. scrypt) because 4 digits are easy to brute-force offline.
function pinHash(studentId: string, pin: string): Buffer {
  return sha256(`${studentId}:${pin}`);
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyPassword(email: string, password: string) {
  const account = ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
  // Hash even for unknown emails so response time doesn't reveal which accounts exist.
  const ok = safeEqual(sha256(password), account?.passwordSha256 ?? sha256("\0no-account"));
  if (!account || !ok) return null;
  return db.profiles.find((p) => p.id === account.profileId) ?? null;
}

export type PinResult =
  | { ok: true; studentId: string }
  | { ok: false; reason: "wrong"; attemptsLeft: number }
  | { ok: false; reason: "locked"; retryInMs: number };

export function verifyStudentPin(studentId: string, pin: string, now = Date.now()): PinResult {
  const state = pinFailures.get(studentId) ?? { count: 0, lockedUntil: 0 };
  if (state.lockedUntil > now) return { ok: false, reason: "locked", retryInMs: state.lockedUntil - now };

  const expected = pinHashes.get(studentId);
  if (expected && /^\d{4}$/.test(pin) && safeEqual(pinHash(studentId, pin), expected)) {
    pinFailures.delete(studentId);
    return { ok: true, studentId };
  }
  const count = state.count + 1;
  if (count >= MAX_PIN_ATTEMPTS) {
    pinFailures.set(studentId, { count: 0, lockedUntil: now + PIN_LOCK_MS });
    return { ok: false, reason: "locked", retryInMs: PIN_LOCK_MS };
  }
  pinFailures.set(studentId, { count, lockedUntil: 0 });
  return { ok: false, reason: "wrong", attemptsLeft: MAX_PIN_ATTEMPTS - count };
}

/** Sets a new random PIN for a guardian's own child; the PIN is returned once and only its hash is kept. */
export function resetStudentPin(guardianId: string, studentId: string): string | null {
  if (!db.students.some((s) => s.id === studentId && s.guardianId === guardianId)) return null;
  const pin = String(randomInt(0, 10_000)).padStart(4, "0");
  pinHashes.set(studentId, pinHash(studentId, pin));
  pinFailures.delete(studentId);
  return pin;
}

/** One-time tablet sign-in link for a guardian's own child. Real tokens would be stored hashed. */
export function createStudentLink(guardianId: string, studentId: string, now = Date.now()): string | null {
  if (!db.students.some((s) => s.id === studentId && s.guardianId === guardianId)) return null;
  const token = randomBytes(18).toString("base64url");
  studentLinks.set(token, { studentId, expiresAt: now + STUDENT_LINK_TTL_MS });
  return token;
}

export function consumeStudentLink(token: string, now = Date.now()): string | null {
  const link = studentLinks.get(token);
  studentLinks.delete(token);
  return link && link.expiresAt > now ? link.studentId : null;
}

/** Children shown on the family tablet's sign-in screen (set up by guardian g1 in the prototype). */
export function tabletChildren(guardianId: string) {
  return db.students.filter((s) => s.guardianId === guardianId).map((s) => ({ id: s.id, nickname: s.nickname }));
}
