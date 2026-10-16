import type { MarkType } from "@/lib/domain/types";
import type { WordRef } from "@/lib/quran/types";

export type SessionRole = "teacher" | "student";

export type LiveMark = WordRef & {
  id: string;
  markType: MarkType;
  /** Last change time; a newer edit with the same id replaces the old one. */
  at: number;
};

export type StudentPosition = { page: number; word: WordRef | null; at: number };

/** Everything both ends must agree on. Sent whole on rejoin (sync_state). */
export type SharedState = {
  position: StudentPosition | null;
  marks: Record<string, LiveMark>;
  cleared: string[];
  endedAt: number | null;
};

// Small JSON only; never audio or video.
export type SessionEvent =
  | { type: "position"; from: SessionRole; position: StudentPosition }
  | { type: "mark"; from: SessionRole; mark: LiveMark }
  | { type: "clear_mark"; from: SessionRole; markId: string }
  | { type: "presence"; from: SessionRole; clientId: string; connected: boolean }
  | { type: "sync_request"; from: SessionRole; clientId: string }
  | { type: "sync_state"; from: SessionRole; to: string; state: SharedState }
  | { type: "end"; from: SessionRole; at: number };

export const emptySharedState = (): SharedState => ({ position: null, marks: {}, cleared: [], endedAt: null });

function mergeMark(state: SharedState, mark: LiveMark): SharedState {
  if (state.cleared.includes(mark.id)) return state;
  const existing = state.marks[mark.id];
  if (existing && existing.at >= mark.at) return state;
  return { ...state, marks: { ...state.marks, [mark.id]: mark } };
}

function clearMark(state: SharedState, markId: string): SharedState {
  if (state.cleared.includes(markId) && !state.marks[markId]) return state;
  const marks = { ...state.marks };
  delete marks[markId];
  return { ...state, marks, cleared: state.cleared.includes(markId) ? state.cleared : [...state.cleared, markId] };
}

export function mergeShared(a: SharedState, b: SharedState): SharedState {
  let s: SharedState = {
    ...a,
    position: !a.position || (b.position && b.position.at > a.position.at) ? b.position : a.position,
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
      return { ...state, position: event.position };
    case "mark":
      return mergeMark(state, event.mark);
    case "clear_mark":
      return clearMark(state, event.markId);
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
  for (const m of Object.values(marks)) map.set(`${m.surah}:${m.ayah}:${m.wordIndex}`, m);
  return map;
}
