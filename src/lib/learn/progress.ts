// Pure learning-progress rules: XP, stars, streaks, letter strength, unlocking and badges.
import type { Badge } from "@/lib/rewards";
import type { LetterId } from "@/lib/qaida/letters";
import { ALL_LETTERS, LESSONS, UNITS } from "./curriculum";

export type ItemStat = { s: number; seen: number; wrong: number; last: string };
export type LessonStat = { stars: 1 | 2 | 3; best: number; plays: number; last: string };

export type LearnerData = {
  xp: number;
  /** XP earned per local day, "YYYY-MM-DD". */
  days: Record<string, number>;
  lessons: Record<string, LessonStat>;
  items: Record<string, ItemStat>;
  goal: number;
  badges: Record<string, string>;
};

export const GOALS = [
  { xp: 10, label: "Gentle" },
  { xp: 20, label: "Steady" },
  { xp: 30, label: "Keen" },
  { xp: 50, label: "Super" },
] as const;

export const emptyLearnerData = (): LearnerData => ({ xp: 0, days: {}, lessons: {}, items: {}, goal: 20, badges: {} });

export type LessonResult = {
  /** A lesson id, or "review" for practice. */
  lessonId: string;
  /** Answers right first time, out of all graded questions. */
  correct: number;
  total: number;
  /** Each graded answer, in order; an item can appear more than once. */
  answers: { item: string; right: boolean }[];
  ms: number;
};

export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function addDays(key: string, n: number): string {
  const t = new Date((dayNumber(key) + n) * 86_400_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/** Days in a row with some learning, ending today, or yesterday if today isn't done yet. */
export function streak(days: Record<string, number>, today: string): number {
  let d = (days[today] ?? 0) > 0 ? today : addDays(today, -1);
  let n = 0;
  while ((days[d] ?? 0) > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function starsFor(correct: number, total: number): 1 | 2 | 3 {
  const acc = total === 0 ? 1 : correct / total;
  return acc >= 0.95 ? 3 : acc >= 0.75 ? 2 : 1;
}

export function xpFor(r: LessonResult, firstTime: boolean): number {
  const perfect = r.total > 0 && r.correct === r.total;
  return (firstTime ? 10 : 5) + (perfect ? 5 : 0);
}

/** Strength 0 (new or shaky) to 5 (solid). A miss knocks it back hard; a hit nudges it up. */
export function nextStrength(s: number, right: boolean): number {
  return right ? Math.min(5, s + 1) : Math.max(0, Math.floor(s / 2) - 1);
}

export function strengthOf(data: LearnerData, item: string): number {
  return data.items[item]?.s ?? 0;
}

export function isDone(data: LearnerData, lessonId: string): boolean {
  return !!data.lessons[lessonId];
}

/** Lessons open in order: a lesson unlocks once the one before it is done. */
export function isUnlocked(data: LearnerData, lessonId: string): boolean {
  const i = LESSONS.findIndex((l) => l.id === lessonId);
  return i === 0 || (i > 0 && isDone(data, LESSONS[i - 1].id));
}

export function currentLessonId(data: LearnerData): string | undefined {
  return LESSONS.find((l) => !isDone(data, l.id))?.id;
}

/** Letters this learner has met in a finished lesson. */
export function learnedLetters(data: LearnerData): LetterId[] {
  const met = new Set(LESSONS.filter((l) => isDone(data, l.id)).flatMap((l) => l.letters));
  return ALL_LETTERS.filter((id) => met.has(id));
}

export const masteredCount = (data: LearnerData) => ALL_LETTERS.filter((id) => strengthOf(data, id) >= 4).length;

const unitDone = (data: LearnerData, unitId: string) =>
  UNITS.find((u) => u.id === unitId)!.lessons.every((l) => isDone(data, l.id));

type BadgeRule = Omit<Badge, "earned"> & { test: (d: LearnerData, today: string, last?: LessonResult) => boolean };

const BADGES: BadgeRule[] = [
  { id: "first", title: "First step", description: "Finish your first lesson", icon: "check", test: (d) => Object.keys(d.lessons).length > 0 },
  { id: "perfect", title: "Perfect!", description: "A lesson with no mistakes", icon: "star", test: (_d, _t, r) => !!r && r.total > 0 && r.correct === r.total },
  { id: "streak3", title: "On fire", description: "Learn 3 days in a row", icon: "flame", test: (d, t) => streak(d.days, t) >= 3 },
  { id: "streak7", title: "Week of light", description: "Learn 7 days in a row", icon: "flame", test: (d, t) => streak(d.days, t) >= 7 },
  { id: "alphabet", title: "Alphabet hero", description: "Meet all 29 letters", icon: "book", test: (d) => ["u1", "u2", "u3"].every((u) => unitDone(d, u)) },
  { id: "dots", title: "Dot detective", description: "Finish Spot the dots", icon: "target", test: (d) => unitDone(d, "u4") },
  { id: "book", title: "Book explorer", description: "Find letters in your Qaida", icon: "book", test: (d) => unitDone(d, "u5") },
  { id: "shapes", title: "Shape spotter", description: "Finish Letter shapes", icon: "target", test: (d) => unitDone(d, "u6") },
  { id: "vowels", title: "First sounds", description: "Finish Short vowels", icon: "star", test: (d) => unitDone(d, "u7") },
  { id: "xp100", title: "100 XP", description: "Earn 100 XP", icon: "star", test: (d) => d.xp >= 100 },
  { id: "xp500", title: "500 XP", description: "Earn 500 XP", icon: "star", test: (d) => d.xp >= 500 },
  { id: "master10", title: "Strong ten", description: "Make 10 letters strong", icon: "check", test: (d) => masteredCount(d) >= 10 },
];

const toBadge = (b: BadgeRule, earned: boolean): Badge => ({ id: b.id, title: b.title, description: b.description, icon: b.icon, earned });

export function badgesOf(data: LearnerData): Badge[] {
  return BADGES.map((b) => toBadge(b, !!data.badges[b.id]));
}

export type Outcome = {
  data: LearnerData;
  xp: number;
  stars: 1 | 2 | 3;
  streakBefore: number;
  streakAfter: number;
  goalJustMet: boolean;
  newBadges: Badge[];
};

export function applyResult(data: LearnerData, r: LessonResult, today: string): Outcome {
  const isLesson = r.lessonId !== "review";
  const prev = data.lessons[r.lessonId];
  const xp = xpFor(r, isLesson && !prev);
  const stars = starsFor(r.correct, r.total);

  const items = { ...data.items };
  for (const a of r.answers) {
    const cur = items[a.item] ?? { s: 0, seen: 0, wrong: 0, last: today };
    items[a.item] = { s: nextStrength(cur.s, a.right), seen: cur.seen + 1, wrong: cur.wrong + (a.right ? 0 : 1), last: today };
  }

  const lessons = isLesson
    ? {
        ...data.lessons,
        [r.lessonId]: {
          stars: Math.max(prev?.stars ?? 1, stars) as 1 | 2 | 3,
          best: Math.max(prev?.best ?? 0, r.total ? r.correct / r.total : 1),
          plays: (prev?.plays ?? 0) + 1,
          last: today,
        },
      }
    : data.lessons;

  const todayXp = (data.days[today] ?? 0) + xp;
  const days = { ...data.days, [today]: todayXp };
  const next: LearnerData = { ...data, xp: data.xp + xp, days, lessons, items, badges: { ...data.badges } };

  const newBadges: Badge[] = [];
  for (const b of BADGES) {
    if (next.badges[b.id] || !b.test(next, today, r)) continue;
    next.badges[b.id] = today;
    newBadges.push(toBadge(b, true));
  }

  return {
    data: next,
    xp,
    stars,
    streakBefore: streak(data.days, today),
    streakAfter: streak(days, today),
    goalJustMet: (data.days[today] ?? 0) < data.goal && todayXp >= data.goal,
    newBadges,
  };
}

/** XP for each of the last 7 days, oldest first. */
export function lastWeek(data: LearnerData, today: string): { day: string; xp: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, xp: data.days[day] ?? 0 };
  });
}
