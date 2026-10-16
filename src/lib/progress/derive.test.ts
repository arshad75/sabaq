import { describe, expect, it } from "vitest";
import { deriveProgress, summariseProgress, type SessionPages } from "./derive";
import type { MarkType } from "@/lib/domain/types";

const session = (id: string, day: number, pages: number[], marks: [number, MarkType][] = []): SessionPages => ({
  sessionId: id,
  startedAt: `2026-10-${String(day).padStart(2, "0")}T09:00:00Z`,
  pagesCovered: pages,
  marks: marks.map(([page, markType]) => ({ page, markType })),
});

describe("deriveProgress", () => {
  it("marks a first read as in progress", () => {
    const p = deriveProgress("s", "quran", [session("a", 1, [1])]);
    expect(p.get(1)?.status).toBe("in_progress");
  });

  it("marks three or more error marks as needs work, ignoring good marks", () => {
    const p = deriveProgress("s", "quran", [
      session("a", 1, [1, 2], [
        [1, "repeat"],
        [1, "slip"],
        [1, "tajweed"],
        [2, "good"],
        [2, "good"],
        [2, "good"],
      ]),
    ]);
    expect(p.get(1)?.status).toBe("needs_work");
    expect(p.get(2)?.status).toBe("in_progress");
  });

  it("marks a clean later read as solid, regardless of input order", () => {
    const p = deriveProgress("s", "quran", [session("b", 5, [1], [[1, "good"]]), session("a", 1, [1], [[1, "repeat"]])]);
    expect(p.get(1)?.status).toBe("solid");
  });

  it("lets a teacher override win, only for its own book", () => {
    const sessions = [session("a", 1, [1], [[1, "repeat"], [1, "repeat"], [1, "repeat"]])];
    const overrides = [
      { studentId: "s", book: "qaida" as const, page: 1, status: "solid" as const, source: "teacher_override" as const, updatedAt: "2026-10-02" },
    ];
    expect(deriveProgress("s", "qaida", sessions, overrides).get(1)).toMatchObject({ status: "solid", source: "teacher_override" });
    expect(deriveProgress("s", "quran", sessions, overrides).get(1)?.status).toBe("needs_work");
  });

  it("summarises counts against the page total", () => {
    const p = deriveProgress("s", "quran", [session("a", 1, [1, 2]), session("b", 2, [1])]);
    const { counts, touched } = summariseProgress(p.values(), 604);
    expect(touched).toBe(2);
    expect(counts).toEqual({ not_started: 602, in_progress: 1, needs_work: 0, solid: 1 });
  });
});
