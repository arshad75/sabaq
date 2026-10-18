// Letter names for tappable boxes on the Qaida's letter pages, each played from a recording in
// public/audio/letters/<id>.mp3. Only letter names, never Quran text.
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

// What a child says for each box: its letter names in reading order (joined words are spelled
// out letter by letter, as the Qaida teaches). Box ids are "line:box", boxes counted right to
// left. Read from the page images box by box; decorations, headings and anything uncertain stay
// silent. Pages 6 (test section) onwards are Quran words or need vowel sounds, so they're left out.
const READINGS: Record<number, Record<string, string>> = {
  1: {
    "2:1": "alif", "2:2": "ba", "2:3": "ta", "2:4": "tha",
    "3:2": "jim", "3:3": "ha", "3:4": "kha",
    "4:1": "dal", "4:2": "dhal", "4:3": "ra", "4:4": "zay",
    "5:1": "sin", "5:2": "shin", "5:3": "sad", "5:4": "dad",
    "6:1": "tta", "6:2": "zza", "6:3": "ayn", "6:4": "ghayn",
  },
  2: {
    "1:1": "fa", "1:2": "qaf", "1:3": "kaf", "1:4": "lam",
    "2:1": "mim", "2:2": "nun", "2:3": "waw", "2:4": "hha",
    "3:1": "hamza", "3:2": "ya", "3:3": "ya",
    "5:1": "ta", "5:2": "tta", "5:3": "tha", "5:4": "sin", "5:5": "shin",
    "5:6": "sad", "5:7": "ha", "5:8": "hha", "5:9": "kha",
    // Row 6's thin alif isn't detected, so its eight boxes skip that column.
    "6:1": "qaf", "6:2": "dhal", "6:3": "zay", "6:4": "dad", "6:5": "zza", "6:6": "ayn", "6:7": "nun", "6:8": "ba",
    "7:1": "fa", "7:2": "ghayn", "7:3": "ya", "7:4": "ta", "7:5": "mim", "7:6": "lam", "7:7": "dal",
    // Joined forms: each letter (the top alif isn't detected) and the forms beneath it.
    "9:1": "ba", "9:2": "ta", "9:3": "jim", "9:4": "dal", "9:5": "ayn", "9:6": "fa",
    "10:1": "alif", "10:2": "ba", "10:3": "ba", "10:4": "ta", "10:5": "ta", "10:6": "jim",
    "10:7": "dal", "10:8": "ayn", "10:9": "ayn", "10:10": "fa", "10:11": "fa",
    "11:1": "kaf", "11:2": "lam", "11:3": "mim", "11:4": "nun", "11:5": "hha", "11:6": "hamza", "11:7": "ya",
    "12:1": "kaf", "12:2": "kaf", "12:3": "lam", "12:4": "mim", "12:5": "mim", "12:6": "nun", "12:7": "nun",
    "12:8": "hha", "12:9": "hha", "12:10": "hamza", "12:11": "hamza", "12:12": "ya", "12:13": "ya",
  },
  3: {
    "2:1": "alif", "2:2": "lam",
    "3:1": "lam alif", "3:2": "jim alif", "3:3": "lam alif", "3:4": "mim alif", "3:5": "lam alif", "3:6": "ba alif",
    "4:1": "lam alif", "4:2": "lam jim", "4:3": "lam alif", "4:4": "lam ba", "4:5": "lam alif", "4:6": "ba lam ba",
    "5:3": "kaf", "5:4": "kaf", "5:5": "kaf",
    // 6:3 and 9:4 each hold two printed words.
    "6:1": "kaf ba", "6:2": "kaf ta", "6:3": "kaf alif kaf alif", "6:4": "ba kaf ta", "6:5": "ta kaf tha",
    "7:1": "ba", "7:2": "ta", "7:3": "tha", "7:4": "nun", "7:5": "ya",
    "8:1": "ba alif", "8:2": "ta alif", "8:3": "tha alif", "8:4": "nun alif", "8:5": "ya alif", "8:6": "ba sin",
    "9:1": "ya sin", "9:2": "nun sin", "9:3": "ta sin", "9:4": "tha sin tha jim", "9:5": "ta ha",
  },
  4: {
    "1:1": "nun kha", "1:2": "ya ha", "1:3": "ba jim", "1:4": "ba mim", "1:5": "ya mim", "1:6": "nun mim",
    "2:1": "ta mim", "2:2": "tha mim", "2:3": "ba ya", "2:4": "ya ya", "2:5": "nun ya", "2:6": "ta ya",
    "3:1": "tha ya", "3:2": "nun ba lam", "3:3": "ta nun lam", "3:4": "ba ya lam", "3:5": "ya ta lam", "3:6": "tha tha lam",
    "4:1": "nun ba nun", "4:2": "ba nun nun", "4:3": "ta ya nun", "4:4": "ya ta nun", "4:5": "tha tha nun", "4:6": "nun ya nun",
    "5:3": "jim", "5:4": "ha", "5:5": "kha",
    "6:1": "ha tha", "6:2": "kha ba", "6:3": "jim ta", "6:4": "ta ha ta", "6:5": "ya jim ba",
    "7:2": "sad ha ba", "7:3": "ba kha ta",
    // ة (round ta) is named Ta.
    "8:3": "ta", "8:4": "hha", "8:5": "hha",
    "9:1": "ba ta", "9:2": "ya hha", "9:3": "ta hha", "9:4": "ya hha ba", "9:5": "ba hha alif", "9:6": "ba hha mim",
  },
  5: {
    "1:2": "dal", "1:3": "dhal", "1:4": "ra", "1:5": "zay",
    "2:1": "jim dal", "2:2": "kha dhal", "2:3": "jim ra", "2:4": "kha zay", "2:5": "ya ra", "2:6": "ta zay",
    "3:1": "mim dal", "3:2": "kaf dhal", "3:3": "fa ra", "3:4": "mim zay",
    "4:1": "sin", "4:2": "shin", "4:3": "sad", "4:4": "dad", "4:5": "tta", "4:6": "zza",
    "5:1": "sin lam", "5:2": "shin lam", "5:3": "sad ba", "5:4": "tta ba", "5:5": "dad alif",
    "6:1": "sin ra", "6:2": "shin qaf", "6:3": "dad ya", "6:4": "zza alif",
    "7:3": "ayn", "7:4": "ghayn", "7:5": "hamza",
    // 8:2 holds two printed words.
    "8:1": "ayn zay", "8:2": "ghayn ra sad ayn", "8:3": "dad ghayn", "8:4": "ba ayn dal", "8:5": "ta ghayn dal",
    "9:2": "hamza", "9:3": "hamza", "9:4": "hamza", "9:5": "hamza",
  },
  6: {
    "1:2": "fa", "1:3": "qaf", "1:4": "waw", "1:5": "mim",
    // 2:5 holds two printed words.
    "2:1": "qaf waw", "2:2": "fa waw", "2:3": "fa qaf lam", "2:4": "qaf fa lam", "2:5": "ya fa ha mim",
    "3:1": "kaf mim", "3:2": "lam mim", "3:3": "ta mim", "3:4": "ta mim ta",
  },
};

const readings = new Map<number, Map<string, LetterName[]>>(
  Object.entries(READINGS).map(([page, cells]) => [
    Number(page),
    new Map(Object.entries(cells).map(([cell, ids]) => [cell, ids.split(" ").map((id) => letterById(id)!)])),
  ]),
);

/** The letter names to say for a box, in reading order (one for a single letter). */
export function readingFor(page: number, cell: Pick<QaidaCell, "id">): LetterName[] | undefined {
  return readings.get(page)?.get(cell.id);
}

/** The letter in a box that holds a single letter (or one letter's joined forms). */
export function letterFor(page: number, cell: Pick<QaidaCell, "id">): LetterName | undefined {
  const r = readingFor(page, cell);
  return r?.length === 1 ? r[0] : undefined;
}

export function pagesWithLetterSounds(): number[] {
  return [...readings.keys()];
}

const clipUrl = (id: string) => `/audio/letters/${id}.mp3`;

// Joined words are spelled in one flow, as a teacher does: each name is trimmed to its voiced
// part and the next starts straight after, with only a breath between.
const JOIN_GAP_S = 0.05;
const FADE_S = 0.008;

let current: { cancelled: boolean; stop: () => void } | null = null;
let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function audioContext(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  // Resuming inside the tap is what lets iPads play the letters that are scheduled later.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function loadBuffer(ac: AudioContext, id: string): Promise<AudioBuffer> {
  let p = buffers.get(id);
  if (!p) {
    p = fetch(clipUrl(id))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
      .then((data) => ac.decodeAudioData(data));
    p.catch(() => buffers.delete(id));
    buffers.set(id, p);
  }
  return p;
}

/** Start and end (seconds) of the voiced part of a clip, ignoring near-silence at either edge. */
export function voicedRange(samples: Float32Array, sampleRate: number, threshold = 0.02): [number, number] {
  let a = 0;
  let b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < threshold) a++;
  while (b > a && Math.abs(samples[b]) < threshold) b--;
  if (a >= b) return [0, samples.length / sampleRate];
  return [a / sampleRate, (b + 1) / sampleRate];
}

function stopCurrent() {
  if (current) {
    current.cancelled = true;
    current.stop();
  }
}

function playJoined(ac: AudioContext, ids: string[], onFail?: () => void) {
  const sources: AudioBufferSourceNode[] = [];
  const run = { cancelled: false, stop: () => sources.forEach((s) => s.stop()) };
  current = run;
  Promise.all(ids.map((id) => loadBuffer(ac, id))).then(
    (bufs) => {
      if (run.cancelled) return;
      let t = ac.currentTime + 0.03;
      for (const buf of bufs) {
        const [from, to] = voicedRange(buf.getChannelData(0), buf.sampleRate);
        const len = to - from;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(1, t + FADE_S);
        gain.gain.setValueAtTime(1, t + len - FADE_S);
        gain.gain.linearRampToValueAtTime(0, t + len);
        gain.connect(ac.destination);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.connect(gain);
        src.start(t, from, len);
        sources.push(src);
        t += len + JOIN_GAP_S;
      }
    },
    () => {
      if (!run.cancelled) onFail?.();
    },
  );
}

function playClips(ids: string[], onFail?: () => void) {
  let clip: HTMLAudioElement | undefined;
  const run = { cancelled: false, stop: () => clip?.pause() };
  current = run;
  const playAt = (i: number) => {
    if (run.cancelled || i >= ids.length) return;
    clip = new Audio(clipUrl(ids[i]));
    clip.onended = () => playAt(i + 1);
    // Some browsers return nothing from play() instead of a promise.
    void Promise.resolve(clip.play()).catch(() => {
      if (!run.cancelled) onFail?.();
    });
  };
  playAt(0);
}

/**
 * Plays the recorded names, a joined word as one flowing phrase. Returns false if any has no
 * recording; calls onFail if a recording can't be played (e.g. offline before it was ever
 * cached). A new call stops the last.
 */
export function speakLetters(letters: readonly Pick<LetterName, "id">[], onFail?: () => void): boolean {
  if (typeof window === "undefined" || typeof Audio === "undefined") return false;
  if (letters.length === 0 || !letters.every((l) => RECORDED.has(l.id))) return false;
  stopCurrent();
  const ids = letters.map((l) => l.id);
  const ac = ids.length > 1 ? audioContext() : null;
  if (ac) playJoined(ac, ids, onFail);
  else playClips(ids, onFail);
  return true;
}

export function speakLetter(letter: Pick<LetterName, "id">, onFail?: () => void): boolean {
  return speakLetters([letter], onFail);
}
