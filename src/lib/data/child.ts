import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssignmentKind, AssignmentStatus, Book, MarkType, PageProgress, PageStatus } from "@/lib/domain/types";
import { deriveProgress } from "@/lib/progress/derive";
import type { LessonForRewards } from "@/lib/rewards";

export type ChildLesson = LessonForRewards & {
  id: string;
  book: Book;
  endedAt: string | null;
  teacherNote: string;
};

export type Homework = {
  id: string;
  kind: AssignmentKind;
  book: Book;
  fromPage: number;
  toPage: number;
  dueOn: string;
  status: AssignmentStatus;
  note: string | null;
};

export type ChildRecord = {
  id: string;
  nickname: string;
  book: Book;
  teacher: { id: string; name: string } | null;
  lessons: ChildLesson[];
  progress: PageProgress[];
  homework: Homework[];
};

type SessionRow = {
  id: string;
  book: Book;
  started_at: string;
  ended_at: string | null;
  pages_covered: number[];
  teacher_note: string;
  marks: { page: number; mark_type: MarkType }[];
};

/** Everything about one child that the signed-in person may see (RLS decides), or null. */
export async function loadChild(supabase: SupabaseClient, id: string): Promise<ChildRecord | null> {
  const { data: student } = await supabase.from("students").select("id, nickname").eq("id", id).maybeSingle();
  if (!student) return null;

  const [{ data: link }, { data: sessions }, { data: overrides }, { data: assignments }] = await Promise.all([
    supabase
      .from("class_members")
      .select("classes(book, teacher_id)")
      .eq("student_id", id)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle<{ classes: { book: Book; teacher_id: string } | null }>(),
    supabase
      .from("sessions")
      .select("id, book, started_at, ended_at, pages_covered, teacher_note, marks(page, mark_type)")
      .eq("student_id", id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .returns<SessionRow[]>(),
    supabase
      .from("page_progress")
      .select("book, page, status, updated_at")
      .eq("student_id", id)
      .eq("source", "teacher_override")
      .returns<{ book: Book; page: number; status: PageStatus; updated_at: string }[]>(),
    supabase
      .from("assignments")
      .select("id, kind, book, from_page, to_page, due_on, status, teacher_feedback")
      .eq("student_id", id)
      .order("due_on", { ascending: false })
      .limit(20),
  ]);

  const book = link?.classes?.book ?? sessions?.[0]?.book ?? "qaida";
  let teacher: ChildRecord["teacher"] = null;
  if (link?.classes?.teacher_id) {
    const { data: t } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", link.classes.teacher_id)
      .maybeSingle();
    if (t) teacher = { id: t.id as string, name: t.display_name as string };
  }

  const lessons: ChildLesson[] = (sessions ?? []).map((s) => ({
    id: s.id,
    book: s.book,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    teacherNote: s.teacher_note,
    pagesCovered: s.pages_covered,
    marks: s.marks.map((m) => ({ page: m.page, markType: m.mark_type })),
  }));

  const progress = [
    ...deriveProgress(
      id,
      book,
      lessons.filter((l) => l.book === book).map((l) => ({ sessionId: l.id, ...l })),
      (overrides ?? []).map((o) => ({
        studentId: id,
        book: o.book,
        page: o.page,
        status: o.status,
        source: "teacher_override" as const,
        updatedAt: o.updated_at,
      })),
    ).values(),
  ];

  return {
    id,
    nickname: student.nickname as string,
    book,
    teacher,
    lessons,
    progress,
    homework: (assignments ?? []).map((a) => ({
      id: a.id as string,
      kind: a.kind as AssignmentKind,
      book: a.book as Book,
      fromPage: a.from_page as number,
      toPage: a.to_page as number,
      dueOn: a.due_on as string,
      status: a.status as AssignmentStatus,
      note: (a.teacher_feedback as string | null) ?? null,
    })),
  };
}
