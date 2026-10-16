"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { Book, MarkType } from "@/lib/domain/types";
import type { WordRef } from "@/lib/quran/types";
import { uid } from "@/lib/uid";
import {
  applyEvent,
  emptySharedState,
  marksByWord,
  mergeShared,
  type PagePoint,
  type SessionEvent,
  type SessionRole,
  type SharedState,
} from "./events";
import { createLocalTransport, type SessionTransport } from "./transport";

export const HEARTBEAT_MS = 2000;
export const STALE_MS = 6000;

export type PeerStatus = "waiting" | "connected" | "reconnecting" | "left";

function storageKey(code: string, role: SessionRole) {
  return `lesson-sync:session:${code}:${role}`;
}

function loadSaved(code: string, role: SessionRole, urlBook: Book | null): SharedState {
  let saved = emptySharedState();
  try {
    const raw = sessionStorage.getItem(storageKey(code, role));
    if (raw) saved = { ...saved, ...(JSON.parse(raw) as SharedState) };
  } catch {
    // Corrupt or unavailable storage: start fresh; the peer will resync us.
  }
  // The teacher picks the book; a student without one learns it from the teacher's state.
  const book = role === "teacher" ? (urlBook ?? saved.book) : (saved.book ?? urlBook);
  return { ...saved, book };
}

type Action = { type: "event"; event: SessionEvent };

function reducer(state: SharedState, action: Action): SharedState {
  return applyEvent(state, action.event);
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Must be rendered client-only (it reads sessionStorage during init). */
export function useLiveSession({
  code,
  role,
  book = null,
  latencyMs = 0,
}: {
  code: string;
  role: SessionRole;
  book?: Book | null;
  latencyMs?: number;
}) {
  const [shared, dispatch] = useReducer(reducer, undefined, () => loadSaved(code, role, book));
  const [clientId] = useState(uid);
  const [peer, setPeer] = useState<{ lastSeen: number | null; left: boolean }>({ lastSeen: null, left: false });
  const [now, setNow] = useState(0);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const transportRef = useRef<SessionTransport | null>(null);
  const sharedRef = useRef(shared);
  useEffect(() => {
    sharedRef.current = shared;
    try {
      sessionStorage.setItem(storageKey(code, role), JSON.stringify(shared));
    } catch {
      // Storage full or blocked; live sync still works.
    }
  }, [shared, code, role]);

  useEffect(() => {
    const t = createLocalTransport(code, { latencyMs });
    transportRef.current = t;
    let lastHeard: number | null = null;
    let peerLeft = false;
    const requestSync = () => t.send({ type: "sync_request", from: role, clientId, state: sharedRef.current });
    const seen = (left = false) => {
      const at = Date.now();
      // Back after a gap: anything either side did meanwhile was lost, so swap state again.
      if (!left && lastHeard !== null && (peerLeft || at - lastHeard > STALE_MS)) requestSync();
      lastHeard = at;
      peerLeft = left;
      setPeer({ lastSeen: at, left });
    };

    const unsubscribe = t.subscribe((e) => {
      if (e.from === role) return;
      switch (e.type) {
        case "presence":
          seen(!e.connected);
          return;
        case "sync_request":
          // Requests carry the sender's state, so whoever joins second still brings both sides together.
          seen();
          dispatch({ type: "event", event: e });
          t.send({ type: "sync_state", from: role, to: e.clientId, state: mergeShared(sharedRef.current, e.state) });
          return;
        case "sync_state":
          if (e.to !== clientId) return;
          seen();
          dispatch({ type: "event", event: e });
          return;
        default:
          seen();
          dispatch({ type: "event", event: e });
      }
    });

    const hello = () => {
      t.send({ type: "presence", from: role, clientId, connected: true });
      requestSync();
    };
    hello();
    const heartbeat = setInterval(() => {
      t.send({ type: "presence", from: role, clientId, connected: true });
      setNow(Date.now());
    }, HEARTBEAT_MS);
    const bye = () => t.send({ type: "presence", from: role, clientId, connected: false });
    window.addEventListener("online", hello);
    window.addEventListener("pagehide", bye);

    return () => {
      bye();
      clearInterval(heartbeat);
      window.removeEventListener("online", hello);
      window.removeEventListener("pagehide", bye);
      unsubscribe();
      t.close();
      transportRef.current = null;
    };
  }, [code, role, latencyMs, clientId]);

  const emit = useCallback((event: SessionEvent) => {
    dispatch({ type: "event", event });
    transportRef.current?.send(event);
  }, []);

  const setPosition = useCallback(
    (page: number, anchor: { word?: WordRef; point?: PagePoint } = {}) =>
      emit({
        type: "position",
        from: role,
        position: { page, word: anchor.word ?? null, point: anchor.point ?? null, at: Date.now() },
      }),
    [emit, role],
  );

  /** Re-marking the same word, or passing an existing mark id, changes that mark instead of adding one. */
  const setMark = useCallback(
    (page: number, anchor: { word?: WordRef; point?: PagePoint }, markType: MarkType, markId?: string) => {
      const w = anchor.word;
      const existing = w ? marksByWord(sharedRef.current.marks).get(`${w.surah}:${w.ayah}:${w.wordIndex}`) : undefined;
      const prev = markId ? sharedRef.current.marks[markId] : existing;
      emit({
        type: "mark",
        from: role,
        mark: {
          id: prev?.id ?? uid(),
          page,
          word: w ?? prev?.word ?? null,
          point: anchor.point ?? prev?.point ?? null,
          markType,
          at: Date.now(),
        },
      });
    },
    [emit, role],
  );

  const clearMark = useCallback((markId: string) => emit({ type: "clear_mark", from: role, markId }), [emit, role]);

  const endSession = useCallback(() => emit({ type: "end", from: role, at: Date.now() }), [emit, role]);

  let peerStatus: PeerStatus;
  if (peer.lastSeen === null) peerStatus = "waiting";
  else if (peer.left) peerStatus = "left";
  else if (now - peer.lastSeen > STALE_MS) peerStatus = "reconnecting";
  else peerStatus = "connected";

  return { shared, book: shared.book ?? "quran", online, peerStatus, setPosition, setMark, clearMark, endSession };
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
