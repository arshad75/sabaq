import type { Book, MarkType } from "@/lib/domain/types";
import type { WordRef } from "@/lib/quran/types";

export type SessionRole = "teacher" | "student";

/** Fraction of page width/height, for image pages that have no word data. */
export type PagePoint = { x: number; y: number };

export type LiveMark = {
  id: string;
  /** 1-based number shown on the pin and in the marks list; kept when the type changes. */
  n: number;
  markType: MarkType;
  page: number;
  word: WordRef | null;
  point: PagePoint | null;
  /** Last change time; a newer edit with the same id replaces the old one. */
  at: number;
};

export type StudentPosition = { page: number; word: WordRef | null; point: PagePoint | null; at: number };

/** Everything both ends must agree on. Sent whole on rejoin (sync_state). */
export type SharedState = {
  book: Book | null;
  position: StudentPosition | null;
  marks: Record<string, LiveMark>;
  cleared: string[];
  /** Every page the student was on or that got a mark, for the saved summary. */
  pages: number[];
  startedAt: number | null;
  endedAt: number | null;
};

// Small JSON only; never audio or video.
export type SessionEvent =
  | { type: "position"; from: SessionRole; position: StudentPosition }
  | { type: "mark"; from: SessionRole; mark: LiveMark }
  | { type: "clear_mark"; from: SessionRole; markId: string }
  | { type: "presence"; from: SessionRole; clientId: string; connected: boolean }
  | { type: "sync_request"; from: SessionRole; clientId: string; state: SharedState }
  | { type: "sync_state"; from: SessionRole; to: string; state: SharedState }
  | { type: "end"; from: SessionRole; at: number };

export const emptySharedState = (book: Book | null = null): SharedState => ({
  book,
  position: null,
  marks: {},
  cleared: [],
  pages: [],
  startedAt: null,
  endedAt: null,
});

function notePage(state: SharedState, page: number, at: number): SharedState {
  const startedAt = state.startedAt === null ? at : Math.min(state.startedAt, at);
  if (state.pages.includes(page) && startedAt === state.startedAt) return state;
  const pages = state.pages.includes(page) ? state.pages : [...state.pages, page].sort((a, b) => a - b);
  return { ...state, pages, startedAt };
}

function mergeMark(state: SharedState, mark: LiveMark): SharedState {
  if (state.cleared.includes(mark.id)) return state;
  const existing = state.marks[mark.id];
  if (existing && existing.at >= mark.at) return state;
  return notePage({ ...state, marks: { ...state.marks, [mark.id]: mark } }, mark.page, mark.at);
}

function clearMark(state: SharedState, markId: string): SharedState {
  if (state.cleared.includes(markId) && !state.marks[markId]) return state;
  const marks = { ...state.marks };
  delete marks[markId];
  return { ...state, marks, cleared: state.cleared.includes(markId) ? state.cleared : [...state.cleared, markId] };
}

export function mergeShared(a: SharedState, b: SharedState): SharedState {
  const aStart = a.startedAt ?? null;
  const bStart = b.startedAt ?? null;
  let s: SharedState = {
    ...a,
    book: a.book ?? b.book,
    position: !a.position || (b.position && b.position.at > a.position.at) ? b.position : a.position,
    pages: [...new Set([...(a.pages ?? []), ...(b.pages ?? [])])].sort((x, y) => x - y),
    startedAt: aStart !== null && bStart !== null ? Math.min(aStart, bStart) : (aStart ?? bStart),
    endedAt: a.endedAt ?? b.endedAt,
  };
  for (const id of b.cleared) s = clearMark(s, id);
  for (const m of Object.values(b.marks)) s = mergeMark(s, m);
  return s;
}

/** Pure reducer for shared state; presence and sync requests are handled by the hook. */
export function applyEvent(state: SharedState, event: SessionEvent): SharedState {
  switch (event.type) {
    case "position":
      if (state.position && state.position.at >= event.position.at) return state;
      return notePage({ ...state, position: event.position }, event.position.page, event.position.at);
    case "mark":
      return mergeMark(state, event.mark);
    case "clear_mark":
      return clearMark(state, event.markId);
    case "sync_request":
    case "sync_state":
      return mergeShared(state, event.state);
    case "end":
      return state.endedAt ? state : { ...state, endedAt: event.at };
    default:
      return state;
  }
}

export function marksByWord(marks: Record<string, LiveMark>): Map<string, LiveMark> {
  const map = new Map<string, LiveMark>();
  for (const m of Object.values(marks)) if (m.word) map.set(`${m.word.surah}:${m.word.ayah}:${m.word.wordIndex}`, m);
  return map;
}
