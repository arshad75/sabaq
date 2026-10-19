import { describe, expect, it } from "vitest";
import { ALL_LETTERS, LESSONS, UNITS, formGlyph, formsOf, isQuranLesson, lessonById, lettersBefore, syllable } from "./curriculum";
import {
  again,
  ayahAudio,
  buildLesson,
  buildReciteLesson,
  buildReview,
  buildWordsLesson,
  distractors,
  findableCells,
  seeded,
  uniqueWords,
  type Exercise,
} from "./exercises";
import { letterById } from "@/lib/qaida/letters";
import { wordsText, type WordVerse } from "@/lib/quran/words";

const graded = (ex: Exercise[]) => ex.filter((e) => e.kind === "choice" || e.kind === "find" || e.kind === "match" || e.kind === "order");
const LETTER_LESSONS = LESSONS.filter((l) => !isQuranLesson(l));

// Obviously fake stand-ins for API data: tests never hold Quran text.
function fakeSurah(surah: number, wordsPerAyah: number[], repeat?: string): WordVerse[] {
  return wordsPerAyah.map((n, i) => {
    const key = `${surah}:${i + 1}`;
    const words = Array.from({ length: n }, (_, p) => ({
      id: `${key}:${p + 1}`,
      position: p + 1,
      text: repeat && p === 0 ? repeat : `[w${i + 1}.${p + 1}]`,
      audio: `https://verses.quran.foundation/wbw/${surah}_${i + 1}_${p + 1}.mp3`,
    }));
    return { key, number: i + 1, text: `[ayah ${key}]`, words };
  });
}

describe("curriculum", () => {
  it("introduces every letter of the alphabet exactly once in units 1 to 3", () => {
    const intro = UNITS.slice(0, 3).flatMap((u) => u.lessons.flatMap((l) => l.intro ?? []));
    expect([...intro].sort()).toEqual([...ALL_LETTERS].sort());
    expect(new Set(intro).size).toBe(29);
  });

  it("has unique lesson ids and only known letters", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LETTER_LESSONS) {
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

  it("puts the Quran units after the letters and vowels, each naming a surah", () => {
    const quran = LESSONS.filter(isQuranLesson);
    expect(LESSONS.findIndex(isQuranLesson)).toBe(LESSONS.findIndex((l) => l.id === "u7-4") + 1);
    expect(quran.map((l) => l.surah)).toEqual([1, 114, 113, 112, 1, 114, 113, 112]);
    for (const l of quran) expect(l.letters).toEqual([]);
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

  it.each(LETTER_LESSONS.map((l) => [l.id]))("builds a sound lesson for %s", (id) => {
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

describe("Quran lessons", () => {
  const surah = fakeSurah(112, [4, 2, 4, 5], "[same]");

  it("keeps one of each distinct word, in reading order", () => {
    const words = uniqueWords(surah);
    expect(new Set(words.map((w) => w.text)).size).toBe(words.length);
    expect(words[0].id).toBe("112:1:1");
    expect(words.filter((w) => w.text === "[same]")).toHaveLength(1);
  });

  it.each([1, 2, 3])("builds a words lesson with clear choices (seed %i)", (seed) => {
    const ex = buildWordsLesson(surah, seeded(seed));
    expect(graded(ex).length).toBeGreaterThanOrEqual(6);
    expect(ex.length).toBeLessThanOrEqual(16);
    for (const e of ex) {
      if (e.kind === "choice") {
        expect(e.options.map((o) => o.id)).toContain(e.answer);
        expect(new Set(e.options.map((o) => o.text)).size).toBe(e.options.length);
        expect(e.options.every((o) => o.quran)).toBe(true);
        expect(e.prompt.audio).toBe(surah.flatMap((v) => v.words).find((w) => w.id === e.answer)!.audio);
      }
      if (e.kind === "order") {
        const v = surah.find((x) => `a:${x.key}` === e.item)!;
        expect(e.words.map((w) => w.text)).toEqual(v.words.map((w) => w.text));
        expect(e.words.length).toBeGreaterThanOrEqual(3);
      }
    }
    // Each new word is met before it is asked.
    ex.forEach((e, i) => {
      if (e.kind === "word") expect(ex[i + 1]).toMatchObject({ kind: "choice", prompt: { audio: e.audio } });
    });
  });

  it("practises the weakest words when nothing is new", () => {
    const strong = (item: string) => (item === "w:112:4:5" ? 1 : 5);
    const ex = buildWordsLesson(surah, seeded(4), strong);
    expect(ex.some((e) => e.kind === "word")).toBe(false);
    expect(ex.find((e) => e.kind === "choice")).toMatchObject({ answer: "112:4:5" });
  });

  it("builds a recite lesson: every ayah in order, then what comes next", () => {
    const ex = buildReciteLesson(surah, seeded(2));
    const recite = ex.filter((e) => e.kind === "recite");
    expect(recite.map((e) => e.audio)).toEqual(surah.map((v) => ayahAudio(v.key)));
    expect(recite.map((e) => (e.kind === "recite" ? e.text : ""))).toEqual(surah.map((v) => v.text));
    const next = ex.filter((e) => e.kind === "choice");
    expect(next).toHaveLength(3);
    for (const e of next) {
      if (e.kind !== "choice") continue;
      const i = surah.findIndex((v) => v.key === e.answer);
      expect(e.prompt.quran).toBe(wordsText(surah[i - 1]));
      expect(e.options.find((o) => o.id === e.answer)!.text).toBe(wordsText(surah[i]));
      expect(e.options.map((o) => o.id)).not.toContain(surah[i - 1].key);
    }
  });

  it("plays the teaching recitation for each ayah", () => {
    expect(ayahAudio("112:3")).toBe("https://everyayah.com/data/Husary_Muallim_128kbps/112003.mp3");
  });
});
