import type { Book, Mark, MarkType, PageProgress, PageStatus } from "@/lib/domain/types";

const ERROR_TYPES: ReadonlySet<MarkType> = new Set(["repeat", "pronunciation", "tajweed", "slip"]);
export const NEEDS_WORK_THRESHOLD = 3;

export type SessionPages = {
  sessionId: string;
  startedAt: string;
  pagesCovered: number[];
  marks: Pick<Mark, "page" | "markType">[];
};

/**
 * Starting rule from datamodels.md:
 * first read -> in_progress; >=3 error marks on a page -> needs_work;
 * a later read with no error marks -> solid; teacher override always wins.
 * A later read with 1-2 errors lands on in_progress (not specified upstream; tune with teachers).
 */
export function deriveProgress(
  studentId: string,
  book: Book,
  sessions: SessionPages[],
  overrides: PageProgress[] = [],
): Map<number, PageProgress> {
  const result = new Map<number, PageProgress>();
  const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  for (const s of ordered) {
    const errorsByPage = new Map<number, number>();
    for (const m of s.marks) {
      if (ERROR_TYPES.has(m.markType)) errorsByPage.set(m.page, (errorsByPage.get(m.page) ?? 0) + 1);
    }
    const pages = new Set([...s.pagesCovered, ...s.marks.map((m) => m.page)]);
    for (const page of pages) {
      const errors = errorsByPage.get(page) ?? 0;
      const seenBefore = result.has(page);
      let status: PageStatus;
      if (errors >= NEEDS_WORK_THRESHOLD) status = "needs_work";
      else if (!seenBefore) status = "in_progress";
      else if (errors === 0) status = "solid";
      else status = "in_progress";
      result.set(page, { studentId, book, page, status, source: "derived", updatedAt: s.startedAt });
    }
  }

  for (const o of overrides) {
    if (o.book === book) result.set(o.page, { ...o, source: "teacher_override" });
  }
  return result;
}

export function summariseProgress(progress: Iterable<PageProgress>, pageCount: number) {
  const counts: Record<PageStatus, number> = { not_started: 0, in_progress: 0, needs_work: 0, solid: 0 };
  let touched = 0;
  for (const p of progress) {
    counts[p.status]++;
    if (p.status !== "not_started") touched++;
  }
  counts.not_started = pageCount - touched;
  return { counts, touched, solidRatio: counts.solid / pageCount };
}
