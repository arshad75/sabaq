"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { BOOKS, type Book } from "@/lib/domain/types";
import { accountHome, createSupabaseServer, getAccount } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const text = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

export type FormState = { status: "idle" | "error" | "sent"; message?: string; email?: string };

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "name", 40);
  const email = text(form, "email", 200).toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name) return { status: "error", message: "Enter your first name.", email };
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Enter a valid email address.", email };
  if (password.length < MIN_PASSWORD) {
    return { status: "error", message: `Use a password of at least ${MIN_PASSWORD} characters.`, email };
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
  if (error) {
    const taken = /already registered|already exists/i.test(error.message);
    return {
      status: "error",
      message: taken
        ? "That email already has an account. Log in, or reset your password."
        : "We couldn’t create your account just now. Please try again.",
      email,
    };
  }
  if (!data.session) return { status: "sent", email };
  redirect("/welcome");
}

export async function signInWithPassword(email: string, password: string): Promise<FormState> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: "error", message: "That email and password don’t match.", email };
  const account = await getAccount();
  redirect(account ? accountHome(account) : "/welcome");
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email", 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Enter a valid email address.", email };
  const supabase = await createSupabaseServer();
  await supabase.auth.resetPasswordForEmail(email);
  return { status: "sent", email };
}

export async function setNewPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < MIN_PASSWORD) {
    return { status: "error", message: `Use a password of at least ${MIN_PASSWORD} characters.` };
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: "This reset link has expired. Ask for a new one." };
  const account = await getAccount();
  redirect(account ? accountHome(account) : "/welcome");
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestLesson(_prev: FormState, form: FormData): Promise<FormState> {
  const account = await getAccount();
  if (!account) redirect("/login");
  const book = String(form.get("book")) as Book;
  const row = {
    child_nickname: text(form, "child", 40),
    book: BOOKS.includes(book) ? book : "qaida",
    preferred_times: text(form, "times", 200),
    timezone: text(form, "timezone", 64) || "UTC",
    note: text(form, "note", 300) || null,
  };
  if (!row.child_nickname) return { status: "error", message: "Enter your child’s first name or a nickname." };
  if (!row.preferred_times) return { status: "error", message: "Tell us which days and times suit you." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("lesson_requests").insert(row);
  if (error) return { status: "error", message: "We couldn’t send your request. Please try again." };
  refresh();
  return { status: "sent" };
}

const REQUEST_STATUSES = ["requested", "scheduled", "done", "cancelled"] as const;

export async function adminUpdateRequest(form: FormData) {
  const status = String(form.get("status"));
  const teacher = String(form.get("teacher") ?? "");
  const supabase = await createSupabaseServer();
  await supabase.rpc("admin_update_request", {
    p_id: String(form.get("id")),
    p_status: REQUEST_STATUSES.includes(status as (typeof REQUEST_STATUSES)[number]) ? status : "requested",
    p_schedule_note: text(form, "schedule", 200),
    p_teacher: teacher || null,
  });
  refresh();
}

export async function adminOnboard(form: FormData) {
  const supabase = await createSupabaseServer();
  await supabase.rpc("admin_onboard_request", { p_request: String(form.get("id")) });
  refresh();
}

export async function adminSetRole(form: FormData) {
  const role = form.get("role") === "teacher" ? "teacher" : "guardian";
  const supabase = await createSupabaseServer();
  await supabase.rpc("admin_set_role", { p_profile: String(form.get("id")), p_role: role });
  refresh();
}
