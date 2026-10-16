"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { BOOKS, PAGE_STATUSES, type Book, type PageStatus } from "@/lib/domain/types";
import { bookPageCount } from "@/lib/books";
import { createSupabaseServer, getAccount } from "@/lib/supabase/server";

const KINDS = ["new", "recent_revision", "old_revision"] as const;
const HOMEWORK_STATUSES = ["assigned", "completed", "needs_more_work"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ActionState = { status: "idle" | "error" | "done"; message?: string };

const pick = <T extends string>(v: FormDataEntryValue | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

async function teacher() {
  const account = await getAccount();
  return account?.role === "teacher" ? account : null;
}

export async function setHomework(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await teacher();
  if (!me) return { status: "error", message: "Only the child’s teacher can set homework." };
  const studentId = String(form.get("student"));
  const book = pick<Book>(form.get("book"), BOOKS, "qaida");
  const from = Number(form.get("from"));
  const to = Number(form.get("to") || from);
  const last = bookPageCount(book);
  if (!UUID_RE.test(studentId) || !Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > last) {
    return { status: "error", message: `Choose pages between 1 and ${last}.` };
  }
  const dueOn = String(form.get("due") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return { status: "error", message: "Choose a due date." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("assignments").insert({
    student_id: studentId,
    teacher_id: me.id,
    kind: pick(form.get("kind"), KINDS, "new"),
    book,
    from_page: from,
    to_page: to,
    due_on: dueOn,
    teacher_feedback: String(form.get("note") ?? "").trim().slice(0, 500) || null,
  });
  if (error) return { status: "error", message: "We couldn’t save the homework. Please try again." };
  refresh();
  return { status: "done", message: "Homework set." };
}

export async function updateHomework(form: FormData) {
  if (!(await teacher())) return;
  const supabase = await createSupabaseServer();
  await supabase
    .from("assignments")
    .update({ status: pick(form.get("status"), HOMEWORK_STATUSES, "assigned") })
    .eq("id", String(form.get("id")));
  refresh();
}

export async function setPageStatus(form: FormData) {
  const me = await teacher();
  if (!me) return;
  const book = pick<Book>(form.get("book"), BOOKS, "qaida");
  const page = Number(form.get("page"));
  if (!Number.isInteger(page) || page < 1 || page > bookPageCount(book)) return;
  const supabase = await createSupabaseServer();
  await supabase.from("page_progress").upsert(
    {
      student_id: String(form.get("student")),
      book,
      page,
      status: pick<PageStatus>(form.get("status"), PAGE_STATUSES, "in_progress"),
      source: "teacher_override",
      updated_by: me.id,
    },
    { onConflict: "student_id,book,page" },
  );
  refresh();
}

/** Parent-only (RLS): deletes the child and everything about them. */
export async function deleteChild(form: FormData) {
  const account = await getAccount();
  if (account?.role !== "guardian") return;
  if (form.get("confirm") !== "delete") return;
  const supabase = await createSupabaseServer();
  await supabase.from("students").delete().eq("id", String(form.get("student")));
  redirect("/welcome");
}

export async function deleteMyAccount(form: FormData) {
  if (form.get("confirm") !== "delete") return;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return;
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
