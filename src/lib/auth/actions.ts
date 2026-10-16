"use server";

import { redirect } from "next/navigation";
import {
  consumeStudentLink,
  createStudentLink,
  resetStudentPin,
  STUDENT_LINK_TTL_MS,
  verifyPassword,
  verifyStudentPin,
} from "@/lib/mock/auth";
import { endSession, getSessionUser, pairTablet, startSession } from "./session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOME = { teacher: "/teacher", guardian: "/guardian", student: "/student" } as const;

export type LoginState = { status: "idle" | "error" | "sent"; message?: string; email?: string };

export async function logIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const method = form.get("method") === "password" ? "password" : "magic";
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Enter a valid email address.", email };

  if (method === "magic") {
    // Same reply whether or not the account exists, so the form can't be used to find accounts.
    return { status: "sent", email };
  }

  const profile = verifyPassword(email, String(form.get("password") ?? ""));
  if (!profile) return { status: "error", message: "That email and password don’t match.", email };
  await startSession({ role: profile.role, id: profile.id });
  redirect(HOME[profile.role]);
}

export type PinState = { status: "idle" | "error" | "locked"; message?: string };

export async function studentPinLogIn(_prev: PinState, form: FormData): Promise<PinState> {
  const studentId = String(form.get("studentId") ?? "");
  const pin = String(form.get("pin") ?? "");
  const result = verifyStudentPin(studentId, pin);
  if (!result.ok) {
    if (result.reason === "locked") {
      const secs = Math.ceil(result.retryInMs / 1000);
      return { status: "locked", message: `Too many tries. Ask a grown-up, or wait ${secs} seconds.` };
    }
    return {
      status: "error",
      message: `That PIN isn’t right. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "try" : "tries"} left.`,
    };
  }
  await startSession({ role: "student", id: result.studentId });
  redirect("/student");
}

export async function redeemStudentLink(form: FormData) {
  const studentId = consumeStudentLink(String(form.get("token") ?? ""));
  if (!studentId) redirect("/login/student?link=expired");
  await startSession({ role: "student", id: studentId });
  redirect("/student");
}

export type GuardianActionResult<T> = { ok: true; value: T } | { ok: false; message: string };

const NOT_GUARDIAN = "Log in as the parent or guardian first.";

/** Guardian-only: makes a one-time sign-in link for their own child. */
export async function makeStudentLink(
  studentId: string,
): Promise<GuardianActionResult<{ path: string; minutes: number }>> {
  const user = await getSessionUser();
  if (user?.role !== "guardian") return { ok: false, message: NOT_GUARDIAN };
  const token = createStudentLink(user.id, studentId);
  if (!token) return { ok: false, message: "You can only make links for your own children." };
  return { ok: true, value: { path: `/login/student/${token}`, minutes: STUDENT_LINK_TTL_MS / 60_000 } };
}

/** Guardian-only: sets a new PIN for their own child and returns it once. */
export async function resetPin(studentId: string): Promise<GuardianActionResult<string>> {
  const user = await getSessionUser();
  if (user?.role !== "guardian") return { ok: false, message: NOT_GUARDIAN };
  const pin = resetStudentPin(user.id, studentId);
  return pin ? { ok: true, value: pin } : { ok: false, message: "You can only change your own children’s PINs." };
}

/** Guardian-only: marks this browser as the family tablet. */
export async function setUpTablet(): Promise<GuardianActionResult<null>> {
  const user = await getSessionUser();
  if (user?.role !== "guardian") return { ok: false, message: NOT_GUARDIAN };
  await pairTablet(user.id);
  redirect("/login/student");
}

export async function logOut() {
  await endSession();
  redirect("/login");
}
