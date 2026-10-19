// The learning path: units of short lessons on the Arabic letters, following the Noorani
// Qaida's order. The letter units hold single letters, marks and English names. The Quran units
// only name a surah; its words and audio are loaded from Quran Foundation when the lesson opens.
import { SURAH_NAMES } from "@/lib/audio/recitation";
import { ALPHABET, letterById, letterFor, type LetterId, type LetterName } from "@/lib/qaida/letters";
import { qaidaCells } from "@/lib/qaida/layout";

export type UnitColor = "mint" | "sky" | "peach" | "lilac" | "sun" | "rose";
export type LessonKind = "letters" | "review" | "dots" | "book" | "shapes" | "vowels" | "words" | "recite";

export type Lesson = {
  id: string;
  title: string;
  kind: LessonKind;
  /** Letters the lesson practises. */
  letters: LetterId[];
  /** Letters shown for the first time, with an introduction card. */
  intro?: LetterId[];
  /** Qaida page and rows for "find it in your book" lessons. */
  page?: number;
  rows?: number[];
  /** Surah for the Quran lessons ("words" and "recite"). */
  surah?: number;
};

/** Lessons whose content comes from the Quran API rather than this file. */
export const isQuranLesson = (l: Lesson) => l.kind === "words" || l.kind === "recite";

export type Unit = { id: string; title: string; goal: string; color: UnitColor; lessons: Lesson[] };

export type Vowel = "a" | "i" | "u";
export const VOWELS: Record<Vowel, { name: string; mark: string; where: string }> = {
  a: { name: "Fatha", mark: "\u064E", where: "a small line above the letter" },
  i: { name: "Kasra", mark: "\u0650", where: "a small line below the letter" },
  u: { name: "Damma", mark: "\u064F", where: "a little waw above the letter" },
};

/** The consonant sound, for reading syllables like "ba", "bi", "bu". */
export const SOUND: Partial<Record<LetterId, string>> = {
  ba: "b", ta: "t", tha: "th", jim: "j", ha: "ḥ", kha: "kh", dal: "d", dhal: "dh", ra: "r", zay: "z",
  sin: "s", shin: "sh", sad: "ṣ", dad: "ḍ", tta: "ṭ", zza: "ẓ", ayn: "ʿ", ghayn: "gh", fa: "f", qaf: "q",
  kaf: "k", lam: "l", mim: "m", nun: "n", waw: "w", hha: "h", ya: "y",
};

/** Dots on each letter, for the look-alike lessons. */
export const DOTS: Record<LetterId, number> = {
  alif: 0, ba: 1, ta: 2, tha: 3, jim: 1, ha: 0, kha: 1, dal: 0, dhal: 1, ra: 0, zay: 1, sin: 0, shin: 3,
  sad: 0, dad: 1, tta: 0, zza: 1, ayn: 0, ghayn: 1, fa: 1, qaf: 2, kaf: 0, lam: 0, mim: 0, nun: 1, waw: 0,
  hha: 0, hamza: 0, ya: 2,
};

/** Groups that differ only by their dots; the best distractors for each other. */
export const LOOK_ALIKES: LetterId[][] = [
  ["ba", "ta", "tha", "nun", "ya"],
  ["jim", "ha", "kha"],
  ["dal", "dhal"],
  ["ra", "zay"],
  ["sin", "shin"],
  ["sad", "dad"],
  ["tta", "zza"],
  ["ayn", "ghayn"],
  ["fa", "qaf"],
];

export type LetterForm = "start" | "middle" | "end";
const TATWEEL = "\u0640";
// These letters never join to the letter after them, so they have no start or middle form.
const NON_JOINING = new Set<LetterId>(["alif", "dal", "dhal", "ra", "zay", "waw", "hamza"]);

export function formsOf(id: LetterId): LetterForm[] {
  if (id === "hamza") return [];
  return NON_JOINING.has(id) ? ["end"] : ["start", "middle", "end"];
}

export function formGlyph(id: LetterId, form: LetterForm): string {
  const g = letter(id).glyph;
  return form === "start" ? g + TATWEEL : form === "middle" ? TATWEEL + g + TATWEEL : TATWEEL + g;
}

export function syllable(id: LetterId, v: Vowel): { glyph: string; reads: string } {
  return { glyph: letter(id).glyph + VOWELS[v].mark, reads: (SOUND[id] ?? "") + v };
}

export function letter(id: LetterId): LetterName {
  const l = letterById(id);
  if (!l) throw new Error(`Unknown letter ${id}`);
  return l;
}

function bookLetters(page: number, rows: number[]): LetterId[] {
  const ids = qaidaCells(page)
    .filter((c) => rows.includes(c.line))
    .map((c) => letterFor(page, c)?.id as LetterId | undefined)
    .filter((id): id is LetterId => !!id);
  return [...new Set(ids)];
}

const ids = (s: string) => s.split(" ") as LetterId[];
const learn = (id: string, title: string, intro: string): Lesson => ({ id, title, kind: "letters", letters: ids(intro), intro: ids(intro) });
const review = (id: string, title: string, letters: LetterId[]): Lesson => ({ id, title, kind: "review", letters });
const quran = (id: string, kind: "words" | "recite", surah: number): Lesson => ({ id, title: SURAH_NAMES[surah - 1], kind, surah, letters: [] });

// The order children usually learn them in: Al-Fatihah first, then from An-Nas back.
const FIRST_SURAHS = [1, 114, 113, 112];

const U1 = ids("alif ba ta tha jim ha kha dal dhal");
const U2 = ids("ra zay sin shin sad dad tta zza ayn");
const U3 = ids("ghayn fa qaf kaf lam mim nun waw hha hamza ya");

export const UNITS: Unit[] = [
  {
    id: "u1",
    title: "First letters",
    goal: "Meet Alif to Dhal and hear their names.",
    color: "mint",
    lessons: [
      learn("u1-1", "Alif, Ba, Ta", "alif ba ta"),
      learn("u1-2", "Tha, Jeem, Ḥa", "tha jim ha"),
      learn("u1-3", "Kha, Dal, Dhal", "kha dal dhal"),
      review("u1-4", "First letters check", U1),
    ],
  },
  {
    id: "u2",
    title: "Middle letters",
    goal: "Ra to ʿAyn, including the heavy letters.",
    color: "sky",
    lessons: [
      learn("u2-1", "Ra, Zay, Seen", "ra zay sin"),
      learn("u2-2", "Sheen, Ṣad, Ḍad", "shin sad dad"),
      learn("u2-3", "Ṭa, Ẓa, ʿAyn", "tta zza ayn"),
      review("u2-4", "Middle letters check", U2),
    ],
  },
  {
    id: "u3",
    title: "Last letters",
    goal: "Finish the alphabet, Ghayn to Ya.",
    color: "peach",
    lessons: [
      learn("u3-1", "Ghayn, Fa, Qaf", "ghayn fa qaf"),
      learn("u3-2", "Kaf, Lam, Meem", "kaf lam mim"),
      learn("u3-3", "Noon, Waw, Ha", "nun waw hha"),
      learn("u3-4", "Hamza, Ya", "hamza ya"),
      review("u3-5", "The whole alphabet", [...U1, ...U2, ...U3]),
    ],
  },
  {
    id: "u4",
    title: "Spot the dots",
    goal: "Tell look-alike letters apart by their dots.",
    color: "lilac",
    lessons: [
      { id: "u4-1", title: "Ba, Ta, Tha", kind: "dots", letters: ids("ba ta tha nun ya") },
      { id: "u4-2", title: "Jeem, Ḥa, Kha", kind: "dots", letters: ids("jim ha kha") },
      { id: "u4-3", title: "Dal, Ra and friends", kind: "dots", letters: ids("dal dhal ra zay") },
      { id: "u4-4", title: "Seen, Ṣad and friends", kind: "dots", letters: ids("sin shin sad dad tta zza") },
      { id: "u4-5", title: "ʿAyn, Fa and friends", kind: "dots", letters: ids("ayn ghayn fa qaf") },
    ],
  },
  {
    id: "u5",
    title: "My Qaida book",
    goal: "Find each letter on the real Qaida pages.",
    color: "sun",
    lessons: [
      { id: "u5-1", title: "Page 1, top", kind: "book", page: 1, rows: [2, 3], letters: bookLetters(1, [2, 3]) },
      { id: "u5-2", title: "Page 1, bottom", kind: "book", page: 1, rows: [4, 5, 6], letters: bookLetters(1, [4, 5, 6]) },
      { id: "u5-3", title: "Page 2, top", kind: "book", page: 2, rows: [1, 2, 3], letters: bookLetters(2, [1, 2, 3]) },
      { id: "u5-4", title: "The Qaida test", kind: "book", page: 2, rows: [5, 6, 7], letters: bookLetters(2, [5, 6, 7]) },
    ],
  },
  {
    id: "u6",
    title: "Letter shapes",
    goal: "Letters change shape when they join. Spot them anywhere.",
    color: "rose",
    lessons: [
      { id: "u6-1", title: "Ba and its family", kind: "shapes", letters: ids("ba ta tha nun ya") },
      { id: "u6-2", title: "Jeem and ʿAyn families", kind: "shapes", letters: ids("jim ha kha ayn ghayn") },
      { id: "u6-3", title: "Seen, Ṣad, Ṭa", kind: "shapes", letters: ids("sin shin sad dad tta zza") },
      { id: "u6-4", title: "Fa to Ha", kind: "shapes", letters: ids("fa qaf kaf lam mim hha") },
      { id: "u6-5", title: "Letters that don’t join", kind: "shapes", letters: ids("alif dal dhal ra zay waw") },
    ],
  },
  {
    id: "u7",
    title: "Short vowels",
    goal: "Fatha, kasra and damma: read your first sounds.",
    color: "mint",
    lessons: [
      { id: "u7-1", title: "Meet the marks", kind: "vowels", letters: ids("ba ta tha") },
      { id: "u7-2", title: "Jeem to Zay", kind: "vowels", letters: ids("jim ha kha dal dhal ra zay") },
      { id: "u7-3", title: "Seen to Ghayn", kind: "vowels", letters: ids("sin shin sad dad tta zza ayn ghayn") },
      { id: "u7-4", title: "Fa to Ya", kind: "vowels", letters: ids("fa qaf kaf lam mim nun waw hha ya") },
    ],
  },
  {
    id: "u8",
    title: "Words from the Quran",
    goal: "Hear real words from your first surahs and find them.",
    color: "sky",
    lessons: FIRST_SURAHS.map((s, i) => quran(`u8-${i + 1}`, "words", s)),
  },
  {
    id: "u9",
    title: "My first surahs",
    goal: "Listen to each ayah, say it after the reciter, and learn what comes next.",
    color: "peach",
    lessons: FIRST_SURAHS.map((s, i) => quran(`u9-${i + 1}`, "recite", s)),
  },
];

export const LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function unitOf(lessonId: string): Unit | undefined {
  return UNITS.find((u) => u.lessons.some((l) => l.id === lessonId));
}

/** Letters met in lessons before this one, for mixing in revision and distractors. */
export function lettersBefore(lessonId: string): LetterId[] {
  const i = LESSONS.findIndex((l) => l.id === lessonId);
  return [...new Set(LESSONS.slice(0, Math.max(0, i)).flatMap((l) => l.letters))];
}

export const ALL_LETTERS = ALPHABET.map((l) => l.id as LetterId);
