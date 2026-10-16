// Prototype session store (in memory; resets on server restart). Supabase Auth replaces this in M3.
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

export type SessionUser = { role: "teacher" | "guardian" | "student"; id: string };

const SESSION_COOKIE = "ls_session";
const TABLET_COOKIE = "ls_tablet";
const SESSION_TTL_S = 60 * 60 * 12;
const TABLET_TTL_S = 60 * 60 * 24 * 180;

// Shared across Next's server bundles and dev reloads.
const store = globalThis as typeof globalThis & {
  __lsSessions?: Map<string, SessionUser>;
  __lsTablets?: Map<string, string>;
};
const sessions = (store.__lsSessions ??= new Map());
const tablets = (store.__lsTablets ??= new Map());

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

/** Call only from a Server Function or Route Handler. */
export async function startSession(user: SessionUser) {
  const token = randomBytes(24).toString("base64url");
  sessions.set(token, user);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_S));
}

/** Call only from a Server Function or Route Handler. */
export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) sessions.delete(token);
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? (sessions.get(token) ?? null) : null;
}

/** Pairs this browser with a family so its tablet sign-in screen can list that family's children. */
export async function pairTablet(guardianId: string) {
  const token = randomBytes(24).toString("base64url");
  tablets.set(token, guardianId);
  (await cookies()).set(TABLET_COOKIE, token, cookieOptions(TABLET_TTL_S));
}

export async function getPairedGuardian(): Promise<string | null> {
  const token = (await cookies()).get(TABLET_COOKIE)?.value;
  return token ? (tablets.get(token) ?? null) : null;
}
