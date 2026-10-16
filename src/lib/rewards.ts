import { MARK_TYPES, type MarkType, type PageProgress } from "@/lib/domain/types";

export type LessonForRewards = {
  startedAt: string;
  pagesCovered: number[];
  marks: { page: number; markType: MarkType }[];
};

export type Badge = { id: string; title: string; description: string; earned: boolean; icon: "star" | "flame" | "check" | "book" | "target" };

const WEEK_MS = 7 * 86_400_000;
const ERRORS: ReadonlySet<MarkType> = new Set(["repeat", "pronunciation", "tajweed", "slip"]);

/** One star per "good" mark. */
export function countStars(lessons: Pick<LessonForRewards, "marks">[]): number {
  return lessons.reduce((n, l) => n + l.marks.filter((m) => m.markType === "good").length, 0);
}

/** Weeks in a row (ending this week or last) with at least one lesson. Weeks start Monday, UTC. */
export function weeklyStreak(lessons: Pick<LessonForRewards, "startedAt">[], now = Date.now()): number {
  const weekOf = (t: number) => {
    const d = new Date(t);
    const day = (d.getUTCDay() + 6) % 7;
    return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - day * 86_400_000) / WEEK_MS);
  };
  const weeks = new Set(lessons.map((l) => weekOf(Date.parse(l.startedAt))));
  let w = weekOf(now);
  if (!weeks.has(w)) w -= 1; // a streak survives until this week ends
  let streak = 0;
  while (weeks.has(w)) {
    streak++;
    w--;
  }
  return streak;
}

/** A page read in a lesson with marks, and none of them corrections. */
export function perfectPages(lessons: LessonForRewards[]): number {
  let n = 0;
  for (const l of lessons) {
    const pages = new Set(l.marks.map((m) => m.page));
    for (const p of pages) {
      const onPage = l.marks.filter((m) => m.page === p);
      if (onPage.length > 0 && onPage.every((m) => !ERRORS.has(m.markType))) n++;
    }
  }
  return n;
}

export function badges(lessons: LessonForRewards[], progress: PageProgress[], now = Date.now()): Badge[] {
  const stars = countStars(lessons);
  const solid = progress.filter((p) => p.status === "solid").length;
  const streak = weeklyStreak(lessons, now);
  const perfect = perfectPages(lessons);
  return [
    { id: "first-lesson", title: "First lesson", description: "Finished a first lesson", earned: lessons.length >= 1, icon: "book" },
    { id: "ten-stars", title: "Star reader", description: "Earned 10 stars", earned: stars >= 10, icon: "star" },
    { id: "perfect-page", title: "Perfect page", description: "A page with no corrections", earned: perfect >= 1, icon: "target" },
    { id: "first-solid", title: "Rock solid", description: "A page marked solid", earned: solid >= 1, icon: "check" },
    { id: "streak-3", title: "Three-week streak", description: "Lessons three weeks in a row", earned: streak >= 3, icon: "flame" },
    { id: "ten-lessons", title: "Dedicated", description: "Finished 10 lessons", earned: lessons.length >= 10, icon: "book" },
    { id: "ten-solid", title: "Ten solid pages", description: "Ten pages marked solid", earned: solid >= 10, icon: "check" },
    { id: "fifty-stars", title: "Shining star", description: "Earned 50 stars", earned: stars >= 50, icon: "star" },
  ];
}

export type TrendBucket = { label: string; sessions: number; counts: Record<MarkType, number> };

/** Marks per week for the last `weeks` weeks, oldest first, for the trend chart. */
export function weeklyTrend(lessons: LessonForRewards[], now = Date.now(), weeks = 6): TrendBucket[] {
  const buckets: TrendBucket[] = Array.from({ length: weeks }, (_, i) => ({
    label: i === weeks - 1 ? "This week" : `${weeks - 1 - i}w ago`,
    sessions: 0,
    counts: Object.fromEntries(MARK_TYPES.map((t) => [t, 0])) as Record<MarkType, number>,
  }));
  for (const l of lessons) {
    const idx = weeks - 1 - Math.floor((now - Date.parse(l.startedAt)) / WEEK_MS);
    if (idx < 0 || idx >= weeks) continue;
    buckets[idx].sessions++;
    for (const m of l.marks) buckets[idx].counts[m.markType]++;
  }
  return buckets;
}
