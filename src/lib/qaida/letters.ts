// Letter names for tappable boxes on the Qaida alphabet pages. A recorded clip in
// public/audio/letters/<id>.mp3 plays when listed in RECORDED; otherwise the device's
// Arabic text-to-speech voice says the name. Only single-letter names, never Quran text.
import type { QaidaCell } from "./layout";

export type LetterName = { id: string; en: string; ar: string };

// Ids of letters with a licensed recording in public/audio/letters (record in DATA_LICENSES.md).
const RECORDED = new Set<string>([]);

const withIds = <T extends Record<string, Omit<LetterName, "id">>>(names: T) =>
  Object.fromEntries(Object.entries(names).map(([id, n]) => [id, { id, ...n }])) as {
    [K in keyof T]: LetterName;
  };

const L = withIds({
  alif: { en: "Alif", ar: "ألف" },
  ba: { en: "Ba", ar: "باء" },
  ta: { en: "Ta", ar: "تاء" },
  tha: { en: "Tha", ar: "ثاء" },
  jim: { en: "Jeem", ar: "جيم" },
  ha: { en: "Ḥa", ar: "حاء" },
  kha: { en: "Kha", ar: "خاء" },
  dal: { en: "Dal", ar: "دال" },
  dhal: { en: "Dhal", ar: "ذال" },
  ra: { en: "Ra", ar: "راء" },
  zay: { en: "Zay", ar: "زاي" },
  sin: { en: "Seen", ar: "سين" },
  shin: { en: "Sheen", ar: "شين" },
  sad: { en: "Ṣad", ar: "صاد" },
  dad: { en: "Ḍad", ar: "ضاد" },
  tta: { en: "Ṭa", ar: "طاء" },
  zza: { en: "Ẓa", ar: "ظاء" },
  ayn: { en: "ʿAyn", ar: "عين" },
  ghayn: { en: "Ghayn", ar: "غين" },
  fa: { en: "Fa", ar: "فاء" },
  qaf: { en: "Qaf", ar: "قاف" },
  kaf: { en: "Kaf", ar: "كاف" },
  lam: { en: "Lam", ar: "لام" },
  mim: { en: "Meem", ar: "ميم" },
  nun: { en: "Noon", ar: "نون" },
  waw: { en: "Waw", ar: "واو" },
  hha: { en: "Ha", ar: "هاء" },
  hamza: { en: "Hamza", ar: "همزة" },
  ya: { en: "Ya", ar: "ياء" },
});

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
  },
};

export function letterFor(page: number, cell: Pick<QaidaCell, "id">): LetterName | undefined {
  return LETTERS[page]?.[cell.id];
}

export function pagesWithLetterSounds(): number[] {
  return Object.keys(LETTERS).map(Number);
}

let arabicVoice: SpeechSynthesisVoice | null | undefined;

function findArabicVoice(): SpeechSynthesisVoice | null | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined; // still loading
  const arabic = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("ar"));
  // Prefer an on-device voice: network voices can be silent when offline.
  return arabic.find((v) => v.localService) ?? arabic[0] ?? null;
}

/** Starts loading the device's voices early; Chrome loads them asynchronously. */
export function warmUpLetterVoice(onReady?: (hasArabic: boolean) => void): () => void {
  if (!canSpeakLetters()) {
    onReady?.(false);
    return () => {};
  }
  const synth = window.speechSynthesis;
  const check = () => {
    const v = findArabicVoice();
    if (v === undefined) return;
    arabicVoice = v;
    onReady?.(v !== null);
  };
  check();
  synth.addEventListener("voiceschanged", check);
  return () => synth.removeEventListener("voiceschanged", check);
}

export function canSpeakLetters(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Says the letter's Arabic name. Returns false if this device can't make a sound for it. */
export function speakLetter(letter: LetterName): boolean {
  if (typeof window === "undefined") return false;
  if (RECORDED.has(letter.id)) {
    clip?.pause();
    clip = new Audio(`/audio/letters/${letter.id}.mp3`);
    void clip.play().catch(() => speakWithVoice(letter));
    return true;
  }
  return speakWithVoice(letter);
}

let clip: HTMLAudioElement | null = null;

function speakWithVoice(letter: LetterName): boolean {
  if (!canSpeakLetters()) return false;
  const synth = window.speechSynthesis;
  if (arabicVoice === undefined) arabicVoice = findArabicVoice();
  if (arabicVoice === null) return false;
  // Chrome can get stuck paused; cancel() only when something is actually playing.
  if (synth.paused) synth.resume();
  if (synth.speaking || synth.pending) synth.cancel();
  const u = new SpeechSynthesisUtterance(letter.ar);
  u.lang = arabicVoice?.lang ?? "ar-SA";
  if (arabicVoice) u.voice = arabicVoice;
  u.rate = 0.8;
  u.volume = 1;
  synth.speak(u);
  return true;
}
