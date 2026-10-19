// Server only: holds the Quran Foundation credentials. Imported by the API routes, never by pages.
import type { ApiWordVerse } from "./words";

const PRODUCTION = { auth: "https://oauth2.quran.foundation", api: "https://apis.quran.foundation/content/api/v4" };
const PRELIVE = { auth: "https://prelive-oauth2.quran.foundation", api: "https://apis-prelive.quran.foundation/content/api/v4" };

const env = () => (process.env.QF_ENV === "prelive" ? PRELIVE : PRODUCTION);
let token: { value: string; until: number } | null = null;

async function accessToken(force = false): Promise<string> {
  if (!force && token && Date.now() < token.until) return token.value;
  const id = process.env.QF_CLIENT_ID;
  const secret = process.env.QF_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Quran Foundation credentials are not configured");
  const res = await fetch(`${env().auth}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=content",
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Quran Foundation token request failed (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  // Renew a minute early so a request never goes out with an expiring token.
  token = { value: body.access_token, until: Date.now() + (body.expires_in - 60) * 1000 };
  return token.value;
}

/** GET from the Content API with the auth headers, renewing the token once if it has expired. */
async function apiGet(path: string): Promise<Response> {
  const get = async (force: boolean) =>
    fetch(`${env().api}${path}`, {
      headers: { "x-auth-token": await accessToken(force), "x-client-id": process.env.QF_CLIENT_ID! },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  const res = await get(false);
  return res.status === 401 ? get(true) : res;
}

/** One ayah's tafsir exactly as the API sends it, or null if it has none. Throws if the API is down. */
export async function fetchTafsir(id: number, surah: number, ayah: number): Promise<{ verses: string[]; html: string } | null> {
  const res = await apiGet(`/tafsirs/${id}/by_ayah/${surah}:${ayah}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Quran Foundation returned ${res.status}`);
  const t = ((await res.json()) as { tafsir?: { verses?: Record<string, unknown>; text?: unknown } }).tafsir;
  if (!t || typeof t.text !== "string" || !t.text) return null;
  return { verses: Object.keys(t.verses ?? {}), html: t.text };
}

/** Every verse of a surah from /verses/by_chapter, all pages fetched in parallel. */
async function chapterVerses<V>(surah: number, query: string): Promise<V[]> {
  type Page = { verses: V[]; pagination: { total_pages: number } };
  const getPage = async (page: number): Promise<Page> => {
    const path = `/verses/by_chapter/${surah}?${query}&per_page=50&page=${page}`;
    let res = await apiGet(path);
    // One retry for a busy or briefly unavailable API.
    if (res.status === 429 || res.status >= 500) res = await apiGet(path);
    if (!res.ok) throw new Error(`Quran Foundation returned ${res.status}`);
    return (await res.json()) as Page;
  };
  const first = await getPage(1);
  const rest = await Promise.all(
    Array.from({ length: Math.min(first.pagination.total_pages, 10) - 1 }, (_, i) => getPage(i + 2)),
  );
  return [first, ...rest].flatMap((p) => p.verses);
}

export type SourceVerse = { key: string; number: number; indopak: string; translation: string };

/** Every ayah of a surah: IndoPak Nastaleeq text and one translation (HTML), exactly as sent. */
export async function fetchSurah(surah: number, translation: number): Promise<SourceVerse[]> {
  type Verse = { verse_key: string; verse_number: number; text_indopak_nastaleeq: string; translations?: { text: string }[] };
  const verses = await chapterVerses<Verse>(surah, `fields=text_indopak_nastaleeq&translations=${translation}`);
  return verses.map((v) => ({ key: v.verse_key, number: v.verse_number, indopak: v.text_indopak_nastaleeq, translation: v.translations?.[0]?.text ?? "" }));
}

/** Every ayah of a surah with its words: IndoPak Nastaleeq text and word clip paths, exactly as sent. */
export async function fetchSurahWords(surah: number): Promise<ApiWordVerse[]> {
  return chapterVerses<ApiWordVerse>(surah, "words=true&word_fields=text_indopak_nastaleeq&fields=text_indopak_nastaleeq");
}
