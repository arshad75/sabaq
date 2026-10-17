import { describe, expect, it } from "vitest";
import { LESSONS } from "./curriculum";
import {
  addDays,
  applyResult,
  currentLessonId,
  emptyLearnerData,
  isUnlocked,
  lastWeek,
  learnedLetters,
  nextStrength,
  starsFor,
  streak,
  type LessonResult,
} from "./progress";

const result = (lessonId: string, correct = 10, total = 10): LessonResult => ({
  lessonId,
  correct,
  total,
  answers: [
    { item: "ba", right: true },
    { item: "ta", right: correct === total },
  ],
  ms: 60_000,
});

describe("learning progress", () => {
  it("does date maths on local day keys", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("counts a streak through yesterday until today is done", () => {
    const days = { "2026-10-15": 10, "2026-10-16": 20 };
    expect(streak(days, "2026-10-17")).toBe(2);
    expect(streak({ ...days, "2026-10-17": 5 }, "2026-10-17")).toBe(3);
    expect(streak(days, "2026-10-18")).toBe(0);
  });

  it("gives stars by accuracy", () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(8, 10)).toBe(2);
    expect(starsFor(5, 10)).toBe(1);
  });

  it("strengthens slowly and drops fast", () => {
    expect(nextStrength(0, true)).toBe(1);
    expect(nextStrength(5, true)).toBe(5);
    expect(nextStrength(5, false)).toBe(1);
    expect(nextStrength(1, false)).toBe(0);
  });

  it("unlocks lessons in order", () => {
    let d = emptyLearnerData();
    expect(isUnlocked(d, LESSONS[0].id)).toBe(true);
    expect(isUnlocked(d, LESSONS[1].id)).toBe(false);
    d = applyResult(d, result(LESSONS[0].id), "2026-10-17").data;
    expect(isUnlocked(d, LESSONS[1].id)).toBe(true);
    expect(currentLessonId(d)).toBe(LESSONS[1].id);
    expect(learnedLetters(d)).toEqual(["alif", "ba", "ta"]);
  });

  it("awards XP, streak, goal and badges once", () => {
    const today = "2026-10-17";
    const first = applyResult({ ...emptyLearnerData(), goal: 10 }, result("u1-1"), today);
    expect(first.xp).toBe(15);
    expect(first.stars).toBe(3);
    expect(first.streakBefore).toBe(0);
    expect(first.streakAfter).toBe(1);
    expect(first.goalJustMet).toBe(true);
    expect(first.newBadges.map((b) => b.id)).toEqual(["first", "perfect"]);

    const replay = applyResult(first.data, result("u1-1", 6, 10), today);
    expect(replay.xp).toBe(5);
    expect(replay.goalJustMet).toBe(false);
    expect(replay.newBadges).toEqual([]);
    expect(replay.data.lessons["u1-1"].stars).toBe(3);
    expect(replay.data.lessons["u1-1"].plays).toBe(2);
    expect(replay.data.items.ta.wrong).toBe(1);
  });

  it("does not record review as a lesson", () => {
    const o = applyResult(emptyLearnerData(), result("review"), "2026-10-17");
    expect(o.data.lessons).toEqual({});
    expect(o.xp).toBe(10);
  });

  it("lists the last 7 days oldest first", () => {
    const w = lastWeek({ ...emptyLearnerData(), days: { "2026-10-17": 15, "2026-10-11": 5 } }, "2026-10-17");
    expect(w).toHaveLength(7);
    expect(w[0]).toEqual({ day: "2026-10-11", xp: 5 });
    expect(w[6]).toEqual({ day: "2026-10-17", xp: 15 });
  });
});
