// Ayah-by-ayah tafseer from the Quran Tafseer API (api.quran-tafseer.com). Fetched through our own
// route (the API is HTTP-only) and shown verbatim, never stored or edited: tafseer quotes Quran words.
// Only public-domain works are offered; see docs/DATA_LICENSES.md before adding one.
import { AYAH_COUNTS } from "@/lib/audio/recitation";

export type Tafseer = { id: number; name: string; author: string; lang: "ar" | "en" };

export const TAFSEERS: readonly Tafseer[] = [
  { id: 10, name: "English meaning (Yusuf Ali)", author: "Abdullah Yusuf Ali", lang: "en" },
  { id: 2, name: "Tafsir al-Jalalayn, short (Arabic)", author: "al-Mahalli and al-Suyuti", lang: "ar" },
  { id: 4, name: "Tafsir Ibn Kathir (Arabic)", author: "Ibn Kathir", lang: "ar" },
  { id: 6, name: "Tafsir al-Baghawi (Arabic)", author: "al-Baghawi", lang: "ar" },
  { id: 7, name: "Tafsir al-Qurtubi (Arabic)", author: "al-Qurtubi", lang: "ar" },
  { id: 8, name: "Tafsir al-Tabari (Arabic)", author: "al-Tabari", lang: "ar" },
];

export const DEFAULT_TAFSEER = TAFSEERS[0].id;

export function tafseerById(id: number): Tafseer | undefined {
  return TAFSEERS.find((t) => t.id === id);
}

/** A tafseer, surah and ayah we serve, or null for anything else. */
export function parseTafseerRef(id: unknown, surah: unknown, ayah: unknown): { id: number; surah: number; ayah: number } | null {
  const n = (v: unknown) => (typeof v === "string" && /^\d{1,3}$/.test(v) ? Number(v) : NaN);
  const ref = { id: n(id), surah: n(surah), ayah: n(ayah) };
  if (!tafseerById(ref.id)) return null;
  if (!(ref.surah >= 1 && ref.surah <= 114)) return null;
  if (!(ref.ayah >= 1 && ref.ayah <= AYAH_COUNTS[ref.surah - 1])) return null;
  return ref;
}

const UPSTREAM = "http://api.quran-tafseer.com/tafseer";
const MAX_CHARS = 60_000;

/** The tafseer text for one ayah, or null if the source has none. Throws if the source is down. */
export async function fetchTafseer(id: number, surah: number, ayah: number): Promise<string | null> {
  const res = await fetch(`${UPSTREAM}/${id}/${surah}/${ayah}`, { signal: AbortSignal.timeout(8000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Tafseer source returned ${res.status}`);
  const body = (await res.json()) as { text?: unknown };
  return typeof body.text === "string" ? body.text.trim().slice(0, MAX_CHARS) : null;
}
