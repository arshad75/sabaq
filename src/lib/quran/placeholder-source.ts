import type { QuranLine, QuranPage, QuranSource } from "./types";
import { wordKey } from "./types";

// Deliberately fake: generic Arabic placeholder words ("word", "example", "text", "test").
// Real text arrives only after a licence-approved source is chosen in M1.
const PLACEHOLDER_WORDS = ["كلمة", "مثال", "نص", "تجربة"];

const PAGE_COUNT = 604;
const SURAH_COUNT = 114;
const LINES_PER_PAGE = 15;
const WORDS_PER_LINE = 8;
const WORDS_PER_AYAH = 7;

function surahStartPage(surah: number): number {
  return 1 + Math.floor(((surah - 1) * (PAGE_COUNT - 1)) / (SURAH_COUNT - 1));
}

function surahForPage(page: number): number {
  let surah = 1;
  while (surah < SURAH_COUNT && surahStartPage(surah + 1) <= page) surah++;
  return surah;
}

function assertPage(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > PAGE_COUNT) {
    throw new RangeError(`Page ${page} is out of range 1-${PAGE_COUNT}`);
  }
}

export function buildPlaceholderPage(page: number): QuranPage {
  assertPage(page);
  const surah = surahForPage(page);
  const startsHere = surahStartPage(surah) === page;
  const wordsBeforePage = (page - surahStartPage(surah)) * LINES_PER_PAGE * WORDS_PER_LINE;

  const lines: QuranLine[] = [];
  for (let l = 0; l < LINES_PER_PAGE; l++) {
    const line: QuranLine = {
      lineNumber: l + 1,
      words: [],
      ayahEnds: [],
      surahStart: startsHere && l === 0 ? surah : undefined,
    };
    for (let w = 0; w < WORDS_PER_LINE; w++) {
      const n = wordsBeforePage + l * WORDS_PER_LINE + w;
      const ayah = Math.floor(n / WORDS_PER_AYAH) + 1;
      const wordIndex = (n % WORDS_PER_AYAH) + 1;
      const ref = { page, surah, ayah, wordIndex };
      const key = wordKey(ref);
      line.words.push({
        ...ref,
        key,
        text: PLACEHOLDER_WORDS[(page + l + w) % PLACEHOLDER_WORDS.length],
      });
      if (wordIndex === WORDS_PER_AYAH) line.ayahEnds.push({ afterWordKey: key, ayah });
    }
    lines.push(line);
  }
  return { page, lines };
}

export const placeholderSource: QuranSource = {
  info: {
    id: "placeholder",
    name: "Layout placeholder (not Quran text)",
    licence: "Generated in-repo, Apache-2.0",
    isPlaceholder: true,
  },
  pageCount: PAGE_COUNT,
  surahCount: SURAH_COUNT,
  async getPage(page) {
    return buildPlaceholderPage(page);
  },
  async getSurahStartPage(surah) {
    if (!Number.isInteger(surah) || surah < 1 || surah > SURAH_COUNT) {
      throw new RangeError(`Surah ${surah} is out of range 1-${SURAH_COUNT}`);
    }
    return surahStartPage(surah);
  },
};
