// Ayah-by-ayah tafsir from the Quran Foundation (Quran.com) Content API, shown verbatim.
// Names and authors are copied from the API's /resources/tafsirs list; see docs/DATA_LICENSES.md.
import { AYAH_COUNTS } from "@/lib/audio/recitation";
import type { Block } from "./tafsir-html";

export type { Block, Run } from "./tafsir-html";
export type Tafseer = { id: number; name: string; author: string; lang: "en" | "ur" | "ar" };

export const TAFSEERS: readonly Tafseer[] = [
  { id: 168, name: "Ma'arif al-Qur'an", author: "Mufti Muhammad Shafi", lang: "en" },
  { id: 169, name: "Ibn Kathir (Abridged)", author: "Hafiz Ibn Kathir", lang: "en" },
  { id: 160, name: "Tafsir Ibn Kathir", author: "Hafiz Ibn Kathir", lang: "ur" },
  { id: 16, name: "Tafsir Muyassar", author: "المیسر", lang: "ar" },
  { id: 91, name: "السعدي Al-Sa'di", author: "Saddi", lang: "ar" },
  { id: 14, name: "Tafsir Ibn Kathir", author: "Hafiz Ibn Kathir", lang: "ar" },
  { id: 15, name: "Tafsir al-Tabari", author: "Tabari", lang: "ar" },
  { id: 90, name: "Al-Qurtubi", author: "Qurtubi", lang: "ar" },
  { id: 94, name: "Tafseer Al-Baghawi", author: "Baghawy", lang: "ar" },
];

export const DEFAULT_TAFSEER = TAFSEERS[0].id;
export const LANGUAGE: Record<Tafseer["lang"], string> = { en: "English", ur: "Urdu", ar: "Arabic" };

export function tafseerById(id: number): Tafseer | undefined {
  return TAFSEERS.find((t) => t.id === id);
}

/** What the tafsir route returns: the ayahs one explanation covers, and its text as plain blocks. */
export type TafsirReply = { verses: string[]; blocks: Block[] };

// Ids and names from the API's /resources/translations list.
export const TRANSLATIONS = [
  { id: 84, name: "Mufti Taqi Usmani", lang: "en" },
  { id: 20, name: "Saheeh International", lang: "en" },
  { id: 151, name: "Shaykh al-Hind Mahmud al-Hasan (with Tafsir-e-Usmani)", lang: "ur" },
  { id: 234, name: "Fateh Muhammad Jalandhari", lang: "ur" },
] as const;
export type TranslationId = (typeof TRANSLATIONS)[number]["id"];
export const DEFAULT_TRANSLATION: TranslationId = 84;

export function translationById(id: number) {
  return TRANSLATIONS.find((t) => t.id === id);
}

/** One ayah as the surah route returns it: IndoPak Nastaleeq text and the translation as plain text. */
export type SurahVerse = { key: string; number: number; text: string; translation: string };
export type SurahReply = { verses: SurahVerse[] };

/** A tafsir, surah and ayah we serve, or null for anything else. */
export function parseTafseerRef(id: unknown, surah: unknown, ayah: unknown): { id: number; surah: number; ayah: number } | null {
  const n = (v: unknown) => (typeof v === "string" && /^\d{1,3}$/.test(v) ? Number(v) : NaN);
  const ref = { id: n(id), surah: n(surah), ayah: n(ayah) };
  if (!tafseerById(ref.id)) return null;
  if (!(ref.surah >= 1 && ref.surah <= 114)) return null;
  if (!(ref.ayah >= 1 && ref.ayah <= AYAH_COUNTS[ref.surah - 1])) return null;
  return ref;
}
