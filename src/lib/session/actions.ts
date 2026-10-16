"use server";

import { getSessionUser } from "@/lib/auth/session";
import { supabaseAuth } from "@/lib/auth/mode";
import { bookPageCount, parseBook } from "@/lib/books";
import { MARK_TYPES, type LessonSession, type Mark, type MarkType } from "@/lib/domain/types";
import { classForStudent, teacherCanSeeStudent } from "@/lib/mock/repo";
import { storeSession } from "@/lib/mock/live-store";
import { createSupabaseServer, getAccount } from "@/lib/supabase/server";
import type { LiveMark } from "./events";
import { isValidRoomCode } from "./room-code";

export type SaveLessonInput = {
  code: string;
  studentId: string;
  book: string;
  startedAt: number | null;
  pages: number[];
  note: string;
  marks: LiveMark[];
};

export type SaveLessonResult = { ok: true; id: string } | { ok: false; message: string };

const MAX_MARKS = 500;
const MAX_LESSON_MS = 12 * 60 * 60 * 1000;
const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isFraction = (v: unknown): v is number => typeof v === "number" && v >= 0 && v <= 1;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOG_IN = "Log in as the teacher to save this lesson.";
const NOT_YOURS = "You can only save lessons for your own approved students.";

/** Who is saving and into which class, checked the same way RLS checks it. */
async function resolveTeacher(studentId: string): Promise<{ teacherId: string; classId: string } | string> {
  if (supabaseAuth) {
    const account = await getAccount();
    if (account?.role !== "teacher") return LOG_IN;
    if (!UUID_RE.test(studentId)) return NOT_YOURS;
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("class_members")
      .select("class_id, classes!inner(teacher_id)")
      .eq("student_id", studentId)
      .eq("status", "approved")
      .eq("classes.teacher_id", account.id)
      .limit(1)
      .maybeSingle<{ class_id: string }>();
    return data ? { teacherId: account.id, classId: data.class_id } : NOT_YOURS;
  }
  const user = await getSessionUser();
  if (user?.role !== "teacher") return LOG_IN;
  if (!teacherCanSeeStudent(user.id, studentId)) return NOT_YOURS;
  return { teacherId: user.id, classId: classForStudent(user.id, studentId)!.id };
}

/** Teacher-only: stores a finished live lesson so its summary and progress reflect it. */
export async function saveLiveLesson(input: SaveLessonInput): Promise<SaveLessonResult> {
  const book = parseBook(input.book);
  if (!book || !isValidRoomCode(input.code) || typeof input.studentId !== "string") {
    return { ok: false, message: "This lesson’s details are incomplete, so it can’t be saved." };
  }
  const who = await resolveTeacher(input.studentId);
  if (typeof who === "string") return { ok: false, message: who };
  const user = { id: who.teacherId };
  const cls = { id: who.classId };
  const lastPage = bookPageCount(book);

  const now = Date.now();
  const started =
    typeof input.startedAt === "number" && input.startedAt <= now && now - input.startedAt < MAX_LESSON_MS
      ? input.startedAt
      : now;
  const id = `live-${input.code}-${started}`;
  const pages = [...new Set((input.pages ?? []).filter((p) => isInt(p, 1, lastPage)))].sort((a, b) => a - b);

  const marks: Mark[] = (input.marks ?? [])
    .slice(0, MAX_MARKS)
    .filter((m) => MARK_TYPES.includes(m.markType as MarkType) && isInt(m.page, 1, lastPage))
    .sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
    .map((m, i) => {
      const word = m.word && isInt(m.word.surah, 1, 114) && isInt(m.word.ayah, 1, 286) && isInt(m.word.wordIndex, 1, 999) ? m.word : null;
      const point = m.point && isFraction(m.point.x) && isFraction(m.point.y) ? m.point : null;
      return {
        id: `${id}-m${i + 1}`,
        sessionId: id,
        studentId: input.studentId,
        markType: m.markType,
        book,
        page: m.page,
        surah: word?.surah ?? null,
        ayah: word?.ayah ?? null,
        wordIndex: word?.wordIndex ?? null,
        x: point?.x ?? null,
        y: point?.y ?? null,
        note: null,
        createdBy: user.id,
      };
    });

  const session: LessonSession = {
    id,
    classId: cls.id,
    teacherId: user.id,
    studentId: input.studentId,
    roomCode: input.code,
    book,
    startedAt: new Date(started).toISOString(),
    endedAt: new Date(now).toISOString(),
    teacherNote: String(input.note ?? "").slice(0, 500),
    pagesCovered: [...new Set([...pages, ...marks.map((m) => m.page)])].sort((a, b) => a - b),
  };
  if (supabaseAuth) return saveToDatabase(session, marks);
  storeSession(session, marks);
  return { ok: true, id };
}

async function saveToDatabase(session: LessonSession, marks: Mark[]): Promise<SaveLessonResult> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      class_id: session.classId,
      teacher_id: session.teacherId,
      student_id: session.studentId,
      room_code: session.roomCode,
      book: session.book,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      teacher_note: session.teacherNote,
      pages_covered: session.pagesCovered,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { ok: false, message: "We couldn’t save this lesson. Please try again." };

  const rows = marks
    .filter((m) => (m.surah && m.ayah && m.wordIndex) || (m.x !== null && m.y !== null))
    .map((m) => ({
      session_id: data.id,
      student_id: m.studentId,
      mark_type: m.markType,
      book: m.book,
      page: m.page,
      surah: m.surah,
      ayah: m.ayah,
      word_index: m.wordIndex,
      x: m.x,
      y: m.y,
      created_by: m.createdBy,
    }));
  if (rows.length) {
    const { error: marksError } = await supabase.from("marks").insert(rows);
    if (marksError) return { ok: false, message: "The lesson was saved, but its marks weren’t. Please try again." };
  }
  return { ok: true, id: data.id };
}
