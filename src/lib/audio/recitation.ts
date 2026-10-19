// Verse-by-verse recitation streamed from everyayah.com (the same source as the reference
// app). Files are streamed, never copied into this repo. See docs/DATA_LICENSES.md.

export const RECITERS = [
  { id: "Husary_Muallim_128kbps", name: "Al-Husary (teaching, slow)" },
  { id: "Abdul_Basit_Murattal_192kbps", name: "Abdul Basit (murattal)" },
  { id: "Minshawy_Murattal_128kbps", name: "Al-Minshawi (murattal)" },
  { id: "Husary_128kbps", name: "Al-Husary" },
  { id: "Alafasy_128kbps", name: "Mishary Alafasy" },
] as const;

export type ReciterId = (typeof RECITERS)[number]["id"];

/** Ayahs per surah, 1-114 (6236 in total). */
export const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77,
  227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36,
  25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const;

/** English transliterations of the surah names. */
export const SURAH_NAMES = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah",
  "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-'Ankabut",
  "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat",
  "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah",
  "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim",
  "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah",
  "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin",
  "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl",
  "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah",
  "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
] as const;

export function ayahCount(surah: number): number {
  return AYAH_COUNTS[surah - 1] ?? 0;
}

export function recitationUrl(reciter: ReciterId, surah: number, ayah: number): string {
  const pad = (n: number) => String(n).padStart(3, "0");
  return `https://everyayah.com/data/${reciter}/${pad(surah)}${pad(ayah)}.mp3`;
}

/** Human-read translations on EveryAyah; each names the Quran Foundation translation it reads. */
export const TRANSLATION_VOICES = [
  {
    id: "en",
    folder: "English/Sahih_Intnl_Ibrahim_Walk_192kbps",
    label: "English",
    name: "Saheeh International, read by Ibrahim Walk",
    reader: "Ibrahim Walk",
    translation: 20,
  },
  {
    id: "ur",
    folder: "translations/urdu_shamshad_ali_khan_46kbps",
    label: "Urdu",
    name: "Fateh Muhammad Jalandhari, read by Shamshad Ali Khan",
    reader: "Shamshad Ali Khan",
    translation: 234,
  },
] as const;

export type VoiceId = (typeof TRANSLATION_VOICES)[number]["id"];

export const voiceById = (id: string) => TRANSLATION_VOICES.find((v) => v.id === id);

export function translationVoiceUrl(voice: VoiceId, surah: number, ayah: number): string {
  const pad = (n: number) => String(n).padStart(3, "0");
  return `https://everyayah.com/data/${voiceById(voice)!.folder}/${pad(surah)}${pad(ayah)}.mp3`;
}

/** The ayah after this one, or null at the end of the surah. */
export function nextAyah(surah: number, ayah: number): { surah: number; ayah: number } | null {
  return ayah < ayahCount(surah) ? { surah, ayah: ayah + 1 } : null;
}
