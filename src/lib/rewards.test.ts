import { describe, expect, it } from "vitest";
import { badges, countStars, perfectPages, weeklyStreak, weeklyTrend, type LessonForRewards } from "./rewards";

const NOW = Date.parse("2026-10-16T09:00:00Z"); // a Friday
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const lesson = (d: number, marks: LessonForRewards["marks"] = []): LessonForRewards => ({
  startedAt: daysAgo(d),
  pagesCovered: [...new Set(marks.map((m) => m.page))],
  marks,
});

describe("rewards", () => {
  it("gives one star per good mark", () => {
    expect(
      countStars([lesson(0, [{ page: 1, markType: "good" }, { page: 1, markType: "repeat" }]), lesson(1, [{ page: 2, markType: "good" }])]),
    ).toBe(2);
  });

  it("counts weeks in a row, and keeps the streak alive until this week ends", () => {
    expect(weeklyStreak([lesson(0), lesson(7), lesson(14)], NOW)).toBe(3);
    expect(weeklyStreak([lesson(7), lesson(14)], NOW)).toBe(2);
    expect(weeklyStreak([lesson(7), lesson(21)], NOW)).toBe(1);
    expect(weeklyStreak([lesson(21)], NOW)).toBe(0);
    expect(weeklyStreak([], NOW)).toBe(0);
  });

  it("counts a perfect page only when it has marks and none are corrections", () => {
    expect(perfectPages([lesson(0, [{ page: 1, markType: "good" }, { page: 2, markType: "good" }, { page: 2, markType: "slip" }])])).toBe(1);
    expect(perfectPages([lesson(0)])).toBe(0);
  });

  it("awards badges from lessons and progress", () => {
    const earned = badges(
      [lesson(0, [{ page: 1, markType: "good" }])],
      [{ studentId: "s", book: "qaida", page: 1, status: "solid", source: "derived", updatedAt: daysAgo(0) }],
      NOW,
    )
      .filter((b) => b.earned)
      .map((b) => b.id);
    expect(earned).toEqual(["first-lesson", "perfect-page", "first-solid"]);
  });

  it("buckets marks by week for the trend chart", () => {
    const t = weeklyTrend([lesson(1, [{ page: 1, markType: "tajweed" }]), lesson(8), lesson(100)], NOW);
    expect(t.at(-1)).toMatchObject({ label: "This week", sessions: 1 });
    expect(t.at(-1)!.counts.tajweed).toBe(1);
    expect(t.at(-2)!.sessions).toBe(1);
    expect(t.reduce((n, b) => n + b.sessions, 0)).toBe(2);
  });
});
