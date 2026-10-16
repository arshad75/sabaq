"use server";

import { getSessionUser } from "@/lib/auth/session";
import { bookPageCount, parseBook } from "@/lib/books";
import { MARK_TYPES, type LessonSession, type Mark, type MarkType } from "@/lib/domain/types";
import { classForStudent, teacherCanSeeStudent } from "@/lib/mock/repo";
import { storeSession } from "@/lib/mock/live-store";
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

/** Teacher-only: stores a finished live lesson so its summary and progress reflect it. */
export async function saveLiveLesson(input: SaveLessonInput): Promise<SaveLessonResult> {
  const user = await getSessionUser();
  if (user?.role !== "teacher") return { ok: false, message: "Log in as the teacher to save this lesson." };

  const book = parseBook(input.book);
  if (!book || !isValidRoomCode(input.code) || typeof input.studentId !== "string") {
    return { ok: false, message: "This lesson’s details are incomplete, so it can’t be saved." };
  }
  // Mirrors RLS: only an approved student in one of this teacher's classes.
  if (!teacherCanSeeStudent(user.id, input.studentId)) {
    return { ok: false, message: "You can only save lessons for your own approved students." };
  }
  const cls = classForStudent(user.id, input.studentId)!;
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
      const word = m.word && isInt(m.word.surah, 1, 114) && isInt(m.word.ayah, 1, 999) && isInt(m.word.wordIndex, 1, 999) ? m.word : null;
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
  storeSession(session, marks);
  return { ok: true, id };
}
