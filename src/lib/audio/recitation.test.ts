import { describe, expect, it } from "vitest";
import { AYAH_COUNTS, SURAH_NAMES, ayahCount, nextAyah, recitationUrl } from "./recitation";
import { letterFor, pagesWithLetterSounds, readingFor } from "@/lib/qaida/letters";
import { qaidaCells } from "@/lib/qaida/layout";

describe("recitation", () => {
  it("has 114 surahs and 6236 ayahs", () => {
    expect(AYAH_COUNTS).toHaveLength(114);
    expect(SURAH_NAMES).toHaveLength(114);
    expect(AYAH_COUNTS.reduce((a, b) => a + b, 0)).toBe(6236);
  });

  it("builds everyayah URLs with zero-padded surah and ayah", () => {
    expect(recitationUrl("Husary_Muallim_128kbps", 1, 7)).toBe(
      "https://everyayah.com/data/Husary_Muallim_128kbps/001007.mp3",
    );
    expect(recitationUrl("Alafasy_128kbps", 114, 6)).toMatch(/\/114006\.mp3$/);
  });

  it("moves to the next ayah and stops at the end of a surah", () => {
    expect(nextAyah(1, 6)).toEqual({ surah: 1, ayah: 7 });
    expect(nextAyah(1, ayahCount(1))).toBeNull();
  });
});

describe("Qaida letter sounds", () => {
  it("only names boxes that exist on the page", () => {
    for (const page of pagesWithLetterSounds()) {
      const ids = new Set(qaidaCells(page).map((c) => c.id));
      const named = qaidaCells(page).filter((c) => readingFor(page, c));
      expect(named.length).toBeGreaterThan(10);
      for (const c of named) expect(ids.has(c.id)).toBe(true);
    }
  });

  it("names the first letter alif and leaves the title silent", () => {
    expect(letterFor(1, { id: "2:1" })?.en).toBe("Alif");
    expect(letterFor(1, { id: "1:1" })).toBeUndefined();
  });
});
