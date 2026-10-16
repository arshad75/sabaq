import { describe, expect, it } from "vitest";
import { buildPlaceholderPage, placeholderSource } from "./placeholder-source";
import { getWord, wordKey } from "./index";

describe("placeholder Quran source", () => {
  it("is clearly flagged as a placeholder", () => {
    expect(placeholderSource.info.isPlaceholder).toBe(true);
  });

  it("builds 15 lines per page with consistent word references", () => {
    const page = buildPlaceholderPage(42);
    expect(page.lines).toHaveLength(15);
    for (const line of page.lines) {
      for (const w of line.words) {
        expect(w.page).toBe(42);
        expect(w.key).toBe(wordKey(w));
      }
    }
  });

  it("keeps ayah numbering continuous across a page break within a surah", () => {
    const a = buildPlaceholderPage(2).lines.at(-1)!.words.at(-1)!;
    const b = buildPlaceholderPage(3).lines[0].words[0];
    expect(b.surah).toBe(a.surah);
    const next = a.wordIndex === 7 ? { ayah: a.ayah + 1, wordIndex: 1 } : { ayah: a.ayah, wordIndex: a.wordIndex + 1 };
    expect({ ayah: b.ayah, wordIndex: b.wordIndex }).toEqual(next);
  });

  it("starts every surah at the top of a page, first and last included", async () => {
    expect(await placeholderSource.getSurahStartPage(1)).toBe(1);
    expect(await placeholderSource.getSurahStartPage(114)).toBe(604);
    const p = await placeholderSource.getSurahStartPage(50);
    expect(buildPlaceholderPage(p).lines[0].surahStart).toBe(50);
  });

  it("rejects out-of-range pages and surahs", async () => {
    expect(() => buildPlaceholderPage(0)).toThrow(RangeError);
    expect(() => buildPlaceholderPage(605)).toThrow(RangeError);
    await expect(placeholderSource.getSurahStartPage(115)).rejects.toThrow(RangeError);
  });

  it("finds a word by reference", async () => {
    const w = buildPlaceholderPage(10).lines[3].words[2];
    expect(await getWord(w)).toMatchObject({ key: w.key, text: w.text });
  });
});
