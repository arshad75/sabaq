// Letter names for tappable boxes on the Qaida alphabet pages, each played from a recording in
// public/audio/letters/<id>.mp3. Only single-letter names, never Quran text.
import type { QaidaCell } from "./layout";

export type LetterName = { id: string; en: string; ar: string; glyph: string };

// Letters with a recording in public/audio/letters, found at build time (see next.config.ts).
const RECORDED = new Set<string>((process.env.NEXT_PUBLIC_RECORDED_LETTERS ?? "").split(",").filter(Boolean));

const withIds = <T extends Record<string, Omit<LetterName, "id">>>(names: T) =>
  Object.fromEntries(Object.entries(names).map(([id, n]) => [id, { id, ...n }])) as {
    [K in keyof T]: LetterName;
  };

const L = withIds({
  alif: { en: "Alif", ar: "ألف", glyph: "ا" },
  ba: { en: "Ba", ar: "باء", glyph: "ب" },
  ta: { en: "Ta", ar: "تاء", glyph: "ت" },
  tha: { en: "Tha", ar: "ثاء", glyph: "ث" },
  jim: { en: "Jeem", ar: "جيم", glyph: "ج" },
  ha: { en: "Ḥa", ar: "حاء", glyph: "ح" },
  kha: { en: "Kha", ar: "خاء", glyph: "خ" },
  dal: { en: "Dal", ar: "دال", glyph: "د" },
  dhal: { en: "Dhal", ar: "ذال", glyph: "ذ" },
  ra: { en: "Ra", ar: "راء", glyph: "ر" },
  zay: { en: "Zay", ar: "زاي", glyph: "ز" },
  sin: { en: "Seen", ar: "سين", glyph: "س" },
  shin: { en: "Sheen", ar: "شين", glyph: "ش" },
  sad: { en: "Ṣad", ar: "صاد", glyph: "ص" },
  dad: { en: "Ḍad", ar: "ضاد", glyph: "ض" },
  tta: { en: "Ṭa", ar: "طاء", glyph: "ط" },
  zza: { en: "Ẓa", ar: "ظاء", glyph: "ظ" },
  ayn: { en: "ʿAyn", ar: "عين", glyph: "ع" },
  ghayn: { en: "Ghayn", ar: "غين", glyph: "غ" },
  fa: { en: "Fa", ar: "فاء", glyph: "ف" },
  qaf: { en: "Qaf", ar: "قاف", glyph: "ق" },
  kaf: { en: "Kaf", ar: "كاف", glyph: "ك" },
  lam: { en: "Lam", ar: "لام", glyph: "ل" },
  mim: { en: "Meem", ar: "ميم", glyph: "م" },
  nun: { en: "Noon", ar: "نون", glyph: "ن" },
  waw: { en: "Waw", ar: "واو", glyph: "و" },
  hha: { en: "Ha", ar: "هاء", glyph: "ه" },
  hamza: { en: "Hamza", ar: "همزة", glyph: "ء" },
  ya: { en: "Ya", ar: "ياء", glyph: "ي" },
});

export type LetterId = keyof typeof L;

/** The alphabet in Qaida order. */
export const ALPHABET: readonly LetterName[] = Object.values(L);

export function letterById(id: string): LetterName | undefined {
  return (L as Record<string, LetterName>)[id];
}

// Box ids are "line:box", boxes counted right to left. Only rows whose detected boxes match
// the printed grid one-to-one are listed; anything uncertain stays silent.
const LETTERS: Record<number, Record<string, LetterName>> = {
  1: {
    "2:1": L.alif, "2:2": L.ba, "2:3": L.ta, "2:4": L.tha,
    "3:2": L.jim, "3:3": L.ha, "3:4": L.kha,
    "4:1": L.dal, "4:2": L.dhal, "4:3": L.ra, "4:4": L.zay,
    "5:1": L.sin, "5:2": L.shin, "5:3": L.sad, "5:4": L.dad,
    "6:1": L.tta, "6:2": L.zza, "6:3": L.ayn, "6:4": L.ghayn,
  },
  2: {
    "1:1": L.fa, "1:2": L.qaf, "1:3": L.kaf, "1:4": L.lam,
    "2:1": L.mim, "2:2": L.nun, "2:3": L.waw, "2:4": L.hha,
    "3:1": L.hamza, "3:2": L.ya, "3:3": L.ya,
    "5:1": L.ta, "5:2": L.tta, "5:3": L.tha, "5:4": L.sin, "5:5": L.shin,
    "5:6": L.sad, "5:7": L.ha, "5:8": L.hha, "5:9": L.kha,
    // Row 6's thin alif isn't detected, so its eight boxes skip that column.
    "6:1": L.qaf, "6:2": L.dhal, "6:3": L.zay, "6:4": L.dad, "6:5": L.zza, "6:6": L.ayn, "6:7": L.nun, "6:8": L.ba,
    "7:1": L.fa, "7:2": L.ghayn, "7:3": L.ya, "7:4": L.ta, "7:5": L.mim, "7:6": L.lam, "7:7": L.dal,
  },
};

export function letterFor(page: number, cell: Pick<QaidaCell, "id">): LetterName | undefined {
  return LETTERS[page]?.[cell.id];
}

export function pagesWithLetterSounds(): number[] {
  return Object.keys(LETTERS).map(Number);
}

let clip: HTMLAudioElement | null = null;

/**
 * Plays the letter's recorded name. Returns false if there is no recording for it; calls onFail
 * if the recording can't be played (e.g. offline before it was ever cached).
 */
export function speakLetter(letter: Pick<LetterName, "id">, onFail?: () => void): boolean {
  if (typeof window === "undefined" || typeof Audio === "undefined" || !RECORDED.has(letter.id)) return false;
  clip?.pause();
  clip = new Audio(`/audio/letters/${letter.id}.mp3`);
  // Some browsers return nothing from play() instead of a promise.
  void Promise.resolve(clip.play()).catch(() => onFail?.());
  return true;
}
