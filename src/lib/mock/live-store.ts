// Live lessons saved when they end. In memory, like the rest of the prototype (resets on restart).
import type { LessonSession, Mark } from "@/lib/domain/types";
import * as db from "./data";

const store = globalThis as typeof globalThis & { __lsSaved?: { sessions: LessonSession[]; marks: Mark[] } };
const saved = (store.__lsSaved ??= { sessions: [], marks: [] });

export function allSessions(): LessonSession[] {
  return [...db.sessions, ...saved.sessions];
}

export function allMarks(): Mark[] {
  return [...db.marks, ...saved.marks];
}

/** Replaces any earlier save of the same lesson, so saving twice is harmless. */
export function storeSession(session: LessonSession, marks: Mark[]) {
  saved.sessions = [...saved.sessions.filter((s) => s.id !== session.id), session];
  saved.marks = [...saved.marks.filter((m) => m.sessionId !== session.id), ...marks];
}
