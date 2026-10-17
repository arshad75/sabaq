import { describe, expect, it } from "vitest";
import { ALL_LETTERS, LESSONS, UNITS, formGlyph, formsOf, lessonById, lettersBefore, syllable } from "./curriculum";
import { again, buildLesson, buildReview, distractors, findableCells, seeded, type Exercise } from "./exercises";
import { letterById } from "@/lib/qaida/letters";

const graded = (ex: Exercise[]) => ex.filter((e) => e.kind === "choice" || e.kind === "find" || e.kind === "match");

describe("curriculum", () => {
  it("introduces every letter of the alphabet exactly once in units 1 to 3", () => {
    const intro = UNITS.slice(0, 3).flatMap((u) => u.lessons.flatMap((l) => l.intro ?? []));
    expect([...intro].sort()).toEqual([...ALL_LETTERS].sort());
    expect(new Set(intro).size).toBe(29);
  });

  it("has unique lesson ids and only known letters", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(l.letters.length, l.id).toBeGreaterThan(0);
      for (const id of l.letters) expect(letterById(id), `${l.id}:${id}`).toBeDefined();
    }
  });

  it("has a single-character glyph for every letter", () => {
    for (const id of ALL_LETTERS) expect([...letterById(id)!.glyph]).toHaveLength(1);
  });

  it("has enough findable letters on each Qaida lesson page", () => {
    for (const l of LESSONS.filter((x) => x.kind === "book")) {
      expect(findableCells(l.page!, l.rows!).length, l.id).toBeGreaterThanOrEqual(7);
      expect(l.letters.length, l.id).toBeGreaterThanOrEqual(6);
    }
  });

  it("shapes and vowels are built from the letter plus marks", () => {
    expect(formsOf("dal")).toEqual(["end"]);
    expect(formsOf("ba")).toHaveLength(3);
    expect(formGlyph("ba", "middle")).toBe("\u0640\u0628\u0640");
    expect(syllable("ba", "i")).toEqual({ glyph: "\u0628\u0650", reads: "bi" });
  });

  it("knows which letters came earlier", () => {
    expect(lettersBefore("u1-1")).toEqual([]);
    expect(lettersBefore("u1-2")).toEqual(["alif", "ba", "ta"]);
  });
});

describe("exercises", () => {
  it("never offers the answer as a distractor, and prefers look-alikes", () => {
    const d = distractors("ba", ["ba", "ta", "tha", "nun", "dal", "ra", "mim"], 3, seeded(1));
    expect(d).not.toContain("ba");
    expect(new Set(d).size).toBe(3);
    expect(d.filter((x) => ["ta", "tha", "nun"].includes(x)).length).toBe(2);
  });

  it.each(LESSONS.map((l) => [l.id]))("builds a sound lesson for %s", (id) => {
    for (const seed of [1, 2, 3]) {
      const ex = buildLesson(lessonById(id)!, seeded(seed));
      expect(graded(ex).length).toBeGreaterThanOrEqual(6);
      expect(ex.length).toBeLessThanOrEqual(16);
      for (const e of ex) {
        if (e.kind === "choice") {
          expect(e.options.map((o) => o.id)).toContain(e.answer);
          expect(new Set(e.options.map((o) => o.id)).size).toBe(e.options.length);
          expect(new Set(e.options.map((o) => o.text)).size).toBe(e.options.length);
          expect(e.options.length).toBeGreaterThanOrEqual(3);
        }
        if (e.kind === "match") expect(e.letters.length).toBeGreaterThanOrEqual(3);
        if (e.kind === "find") {
          const cells = findableCells(e.page, e.rows);
          expect(cells.some((c) => c.id && e.answer)).toBe(true);
        }
      }
      expect(new Set(ex.map((e) => e.key)).size).toBe(ex.length);
    }
  });

  it("introduces each new letter before asking about it", () => {
    const ex = buildLesson(lessonById("u1-2")!, seeded(7));
    for (const id of ["tha", "jim", "ha"]) {
      const introAt = ex.findIndex((e) => e.kind === "intro" && e.letter === id);
      const firstAsk = ex.findIndex((e) => e.kind === "choice" && e.answer === id);
      expect(introAt).toBeGreaterThanOrEqual(0);
      expect(introAt).toBeLessThan(firstAsk);
    }
  });

  it("puts the weakest letters into review", () => {
    const strength = (id: string) => (id === "kha" || id === "dal" ? 0 : 5);
    const ex = buildReview(["alif", "ba", "ta", "tha", "jim", "ha", "kha", "dal", "dhal"], strength, seeded(3));
    const asked = ex.flatMap((e) => (e.kind === "choice" ? [e.answer] : []));
    expect(asked).toContain("kha");
    expect(asked).toContain("dal");
    expect(buildReview(["alif"], strength, seeded(3))).toEqual([]);
  });

  it("asks again with a new key", () => {
    const [e] = buildLesson(lessonById("u4-1")!, seeded(5)).filter((x) => x.kind === "choice");
    const e2 = again(e, seeded(9));
    expect(e2.key).not.toBe(e.key);
    expect(e2.kind).toBe("choice");
  });
});
