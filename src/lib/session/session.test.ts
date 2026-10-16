import { describe, expect, it } from "vitest";
import { generateRoomCode, isValidRoomCode, normaliseRoomCode, ROOM_CODE_ALPHABET } from "./room-code";
import { applyEvent, emptySharedState, marksByWord, mergeShared, type LiveMark, type SessionEvent } from "./events";

describe("room codes", () => {
  it("generates valid 6-character codes without ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(isValidRoomCode(code)).toBe(true);
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it("maps random values onto the alphabet", () => {
    const code = generateRoomCode((a) => a.map((_, i) => i * 33));
    expect(code).toBe([0, 33, 66, 99, 132, 165].map((n) => ROOM_CODE_ALPHABET[n % 32]).join(""));
  });

  it("normalises user input", () => {
    expect(normaliseRoomCode(" k7m-2qx ")).toBe("K7M2QX");
    expect(isValidRoomCode("K7M2Q")).toBe(false);
    expect(isValidRoomCode("K7M2Q0")).toBe(false);
  });
});

const word = { page: 1, surah: 1, ayah: 2, wordIndex: 3 };
const mark = (over: Partial<LiveMark> = {}): LiveMark => ({
  id: "m1",
  page: 1,
  word,
  point: null,
  markType: "repeat",
  at: 10,
  ...over,
});
const pos = (page: number, at: number) => ({ page, word: null, point: null, at });

describe("session events", () => {
  it("keeps the newest position only", () => {
    let s = applyEvent(emptySharedState(), { type: "position", from: "student", position: pos(5, 20) });
    s = applyEvent(s, { type: "position", from: "student", position: pos(4, 10) });
    expect(s.position?.page).toBe(5);
  });

  it("keeps point marks for image pages (Qaida) apart from word marks", () => {
    let s = applyEvent(emptySharedState("qaida"), {
      type: "mark",
      from: "teacher",
      mark: mark({ id: "p1", word: null, point: { x: 0.4, y: 0.6 } }),
    });
    s = applyEvent(s, { type: "mark", from: "teacher", mark: mark({ id: "w1" }) });
    expect(s.marks.p1.point).toEqual({ x: 0.4, y: 0.6 });
    expect([...marksByWord(s.marks).values()].map((m) => m.id)).toEqual(["w1"]);
  });

  it("adds, changes, and clears marks", () => {
    let s = applyEvent(emptySharedState(), { type: "mark", from: "teacher", mark: mark() });
    s = applyEvent(s, { type: "mark", from: "teacher", mark: mark({ markType: "tajweed", at: 11 }) });
    expect(s.marks.m1.markType).toBe("tajweed");
    s = applyEvent(s, { type: "clear_mark", from: "teacher", markId: "m1" });
    expect(s.marks.m1).toBeUndefined();
    // A late duplicate of a cleared mark must not resurrect it.
    s = applyEvent(s, { type: "mark", from: "teacher", mark: mark({ at: 12 }) });
    expect(s.marks.m1).toBeUndefined();
  });

  it("is idempotent when events are replayed", () => {
    const events: SessionEvent[] = [
      { type: "mark", from: "teacher", mark: mark() },
      { type: "position", from: "student", position: { page: 2, word, point: null, at: 5 } },
    ];
    const once = events.reduce(applyEvent, emptySharedState());
    const twice = [...events, ...events].reduce(applyEvent, emptySharedState());
    expect(twice).toEqual(once);
  });

  it("merges a rejoining client's state with the live state", () => {
    const live = applyEvent(emptySharedState(), { type: "mark", from: "teacher", mark: mark({ id: "a" }) });
    const stale = { ...emptySharedState(), position: pos(9, 99), cleared: ["a"] };
    const merged = mergeShared(live, stale);
    expect(merged.position?.page).toBe(9);
    expect(merged.marks.a).toBeUndefined();
  });

  it("lets a student learn the book from the teacher's sync request", () => {
    const student = emptySharedState();
    const teacher = emptySharedState("qaida");
    const s = applyEvent(student, { type: "sync_request", from: "teacher", clientId: "t", state: teacher });
    expect(s.book).toBe("qaida");
  });

  it("records the end of a session once", () => {
    let s = applyEvent(emptySharedState(), { type: "end", from: "teacher", at: 50 });
    s = applyEvent(s, { type: "end", from: "student", at: 60 });
    expect(s.endedAt).toBe(50);
  });
});
