export type WordRef = {
  page: number;
  surah: number;
  ayah: number;
  wordIndex: number;
};

export type QuranWord = WordRef & {
  key: string;
  text: string;
};

export type QuranLine = {
  lineNumber: number;
  words: QuranWord[];
  /** Ayah numbers that end on this line, rendered as markers after the given word key. */
  ayahEnds: { afterWordKey: string; ayah: number }[];
  /** Set when a surah starts on this line; rendered as a header above it. */
  surahStart?: number;
};

export type QuranPage = {
  page: number;
  lines: QuranLine[];
};

export type SourceInfo = {
  id: string;
  name: string;
  licence: string;
  isPlaceholder: boolean;
};

export interface QuranSource {
  info: SourceInfo;
  pageCount: number;
  surahCount: number;
  getPage(page: number): Promise<QuranPage>;
  getSurahStartPage(surah: number): Promise<number>;
}

export const wordKey = (ref: Pick<WordRef, "surah" | "ayah" | "wordIndex">) =>
  `${ref.surah}:${ref.ayah}:${ref.wordIndex}`;
