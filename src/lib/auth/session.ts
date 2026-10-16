// Prototype sessions as HMAC-signed cookies, so they survive serverless instances
// (Vercel) without a store. Supabase Auth replaces this in M3.
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type SessionUser = { role: "teacher" | "guardian" | "student"; id: string };

const SESSION_COOKIE = "ls_session";
const TABLET_COOKIE = "ls_tablet";
const SESSION_TTL_S = 60 * 60 * 12;
const TABLET_TTL_S = 60 * 60 * 24 * 180;
const ROLES = new Set(["teacher", "guardian", "student"]);

const store = globalThis as typeof globalThis & { __sabaqDevSecret?: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (32+ characters).");
  // Dev only: a per-process secret, so restarting the server logs everyone out.
  return (store.__sabaqDevSecret ??= randomBytes(32).toString("hex"));
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function encodeToken(payload: object, ttlS: number, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(now / 1000) + ttlS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeToken(token: string | undefined, now?: number): Record<string, unknown> | null {
  const [body, mac] = token?.split(".") ?? [];
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as Record<string, unknown>;
    return typeof data.exp === "number" && data.exp * 1000 > (now ?? Date.now()) ? data : null;
  } catch {
    return null;
  }
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

/** Call only from a Server Function or Route Handler. */
export async function startSession(user: SessionUser) {
  (await cookies()).set(SESSION_COOKIE, encodeToken(user, SESSION_TTL_S), cookieOptions(SESSION_TTL_S));
}

/** Call only from a Server Function or Route Handler. */
export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Reads and verifies a signed cookie. The expiry check uses the clock, so it must run at request time. */
async function readSigned(name: string) {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  await connection();
  return decodeToken(token);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const data = await readSigned(SESSION_COOKIE);
  if (!data || !ROLES.has(data.role as string) || typeof data.id !== "string") return null;
  return { role: data.role as SessionUser["role"], id: data.id };
}

/** Pairs this browser with a family so its tablet sign-in screen can list that family's children. */
export async function pairTablet(guardianId: string) {
  (await cookies()).set(TABLET_COOKIE, encodeToken({ guardianId }, TABLET_TTL_S), cookieOptions(TABLET_TTL_S));
}

export async function getPairedGuardian(): Promise<string | null> {
  const data = await readSigned(TABLET_COOKIE);
  return typeof data?.guardianId === "string" ? data.guardianId : null;
}
