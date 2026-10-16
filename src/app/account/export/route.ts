import { NextResponse } from "next/server";
import { createSupabaseServer, getAccount } from "@/lib/supabase/server";

/** Everything stored about the signed-in person and their children, as a JSON download. */
export async function GET() {
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  const supabase = await createSupabaseServer();

  // RLS limits every query to what this person may see.
  const [children, links, sessions, progress, homework, requests] = await Promise.all([
    supabase.from("students").select("id, nickname, login_method, recording_consent, created_at"),
    supabase.from("class_members").select("student_id, status, approved_by_guardian_at, classes(name, book)"),
    supabase
      .from("sessions")
      .select("id, student_id, book, started_at, ended_at, pages_covered, teacher_note, marks(mark_type, page, surah, ayah, word_index, x, y, created_at)")
      .order("started_at"),
    supabase.from("page_progress").select("student_id, book, page, status, source, updated_at"),
    supabase.from("assignments").select("student_id, kind, book, from_page, to_page, due_on, status, teacher_feedback"),
    supabase.from("lesson_requests").select("child_nickname, book, preferred_times, timezone, note, status, schedule_note, created_at"),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    account: { email: account.email, name: account.displayName, role: account.role },
    children: children.data ?? [],
    teacherLinks: links.data ?? [],
    lessons: sessions.data ?? [],
    pageProgress: progress.data ?? [],
    homework: homework.data ?? [],
    lessonRequests: requests.data ?? [],
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sabaq-export-${body.exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
