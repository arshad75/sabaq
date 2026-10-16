import { placeholderSource } from "./placeholder-source";
import type { QuranPage, QuranSource, QuranWord, WordRef } from "./types";

export * from "./types";

// Single switch point: swap for the licence-approved source in M1.
let activeSource: QuranSource = placeholderSource;

export function getSource(): QuranSource {
  return activeSource;
}

/** Test seam only. */
export function setSourceForTesting(source: QuranSource) {
  activeSource = source;
}

export function getPage(page: number): Promise<QuranPage> {
  return activeSource.getPage(page);
}

export async function getWord(ref: WordRef): Promise<QuranWord | undefined> {
  const page = await activeSource.getPage(ref.page);
  for (const line of page.lines) {
    const word = line.words.find(
      (w) => w.surah === ref.surah && w.ayah === ref.ayah && w.wordIndex === ref.wordIndex,
    );
    if (word) return word;
  }
  return undefined;
}

export async function getPageRange(from: number, to: number): Promise<QuranPage[]> {
  const pages: Promise<QuranPage>[] = [];
  for (let p = from; p <= to; p++) pages.push(activeSource.getPage(p));
  return Promise.all(pages);
}

export function getSurahStartPage(surah: number): Promise<number> {
  return activeSource.getSurahStartPage(surah);
}

export function clampPage(page: number): number {
  return Math.min(Math.max(1, Math.round(page)), activeSource.pageCount);
}
