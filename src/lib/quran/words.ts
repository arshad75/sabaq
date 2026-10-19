// Word by word Quran data for the learning journey: each word's IndoPak Nastaleeq text and its
// recorded clip, exactly as Quran Foundation sends them. Nothing here is typed by hand.

export type QuranWord = { id: string; position: number; text: string; audio: string };
export type WordVerse = { key: string; number: number; text: string; words: QuranWord[] };
export type WordsReply = { verses: WordVerse[] };

/** The verse shape the Content API returns with `words=true&word_fields=text_indopak_nastaleeq`. */
export type ApiWordVerse = {
  verse_key: string;
  verse_number: number;
  text_indopak_nastaleeq?: string;
  words?: { position: number; char_type_name: string; audio_url?: string | null; text_indopak_nastaleeq?: string }[];
};

// Word clips are served from Quran Foundation's CDN; audio_url is a path like "wbw/112_001_001.mp3".
const AUDIO_HOST = "https://verses.quran.foundation/";
const AUDIO_PATH = /^wbw\/\d{3}_\d{3}_\d{3}\.mp3$/;

/** Keeps the words (not verse-end markers) with their clips. Throws rather than show a verse with a word missing. */
export function toWordVerses(raw: ApiWordVerse[]): WordVerse[] {
  return raw.map((v) => {
    if (!v.text_indopak_nastaleeq) throw new Error(`No text for ${v.verse_key}`);
    const words = (v.words ?? [])
      .filter((w) => w.char_type_name === "word")
      .map((w) => {
        if (!w.text_indopak_nastaleeq || !w.audio_url || !AUDIO_PATH.test(w.audio_url)) throw new Error(`Incomplete word ${v.verse_key}:${w.position}`);
        return { id: `${v.verse_key}:${w.position}`, position: w.position, text: w.text_indopak_nastaleeq, audio: AUDIO_HOST + w.audio_url };
      });
    if (words.length === 0) throw new Error(`No words for ${v.verse_key}`);
    return { key: v.verse_key, number: v.verse_number, text: v.text_indopak_nastaleeq, words };
  });
}

const surahs = new Map<number, Promise<WordsReply>>();

/** An ayah's words joined by spaces, as Quran Foundation's guide renders them, without the end-of-ayah marker. */
export const wordsText = (v: WordVerse) => v.words.map((w) => w.text).join(" ");

/** A surah's words from our API route, fetched once per page load. */
export function loadWords(surah: number): Promise<WordsReply> {
  let p = surahs.get(surah);
  if (!p) {
    p = fetch(`/api/quran/${surah}/words`).then((r) => (r.ok ? (r.json() as Promise<WordsReply>) : Promise.reject(new Error(String(r.status)))));
    p.catch(() => surahs.delete(surah));
    surahs.set(surah, p);
  }
  return p;
}
