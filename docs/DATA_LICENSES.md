# Data and font licences

Every text, font, or page-image source must be listed here with its licence before it
is used. If unsure, stop and ask.

## In use

| Asset | Source | Licence | Where | Notes |
|---|---|---|---|---|
| Placeholder reading text | Generated in this repo (`src/lib/quran/placeholder-source.ts`) | Apache-2.0 (this repo) | Reading view until M1 | Generic Arabic words ("word", "example", "text", "test"). **Not Quran text.** |
| Geist, Geist Mono (UI font) | Vercel, via `next/font/google` (self-hosted at build time) | SIL Open Font License 1.1 | App chrome | No runtime requests to Google. |
| Arabic stand-in font | Operating-system fonts only (CSS stack) | n/a, nothing shipped | Reading view until M1 | Replace with a licensed Quranic font in M1. |
| Noorani Qaida – Indian Edition, pages 1–39 (`public/qaida/*.webp`) | Qamar Apps, https://www.qamarapps.com (licence: https://www.qamarapps.com/license.html, also printed on page 3 of the PDF) | CC BY-SA 4.0 | Qaida lessons (live session, practice, summaries) | Extracted from the publisher's PDF with `scripts/extract-qaida.py`, resized to 900 px, WebP. Attribution shown under every page and in `public/qaida/ATTRIBUTION.txt`. ShareAlike: these images (and any edits to them) stay CC BY-SA, separate from the Apache-2.0 code. The source PDF is not committed. |
| Qaida word-box layout (`src/lib/qaida/layout.json`) | Measured from the page images above by `scripts/qaida-layout.py` | Treated as CC BY-SA 4.0 (derived from the images) | Tappable words on Qaida pages | Rectangles only, no text. Credit as above. |
| Tafseer text (per ayah, `/listen`) | Quran Tafseer API, `api.quran-tafseer.com/tafseer/{id}/{surah}/{ayah}` (fetched through our `/api/tafseer` route because the API is HTTP-only) | **API: no licence stated** ("free to use"). Works offered are public domain: Tafsir al-Jalalayn, Ibn Kathir, al-Baghawi, al-Qurtubi, al-Tabari (classical), and Abdullah Yusuf Ali's English (1934). Chosen by the project owner on 2026-10-19. | `/listen`, under the player | Fetched and cached, never copied into the repo or database; shown verbatim (it quotes Quran words, so it is never edited). Credited under the panel. **Not offered** until permission is confirmed: at-Tafsir al-Muyassar (King Fahd Complex), as-Sa'di, Tantawi, Arberry and the Dutch translations (modern, still in copyright). |
| Recitation audio (verse by verse) | EveryAyah.com, streamed from `everyayah.com/data/<reciter>/SSSAAA.mp3` (reciters: Al-Husary teaching, Abdul Basit, Al-Minshawi, Al-Husary, Alafasy) | **No licence stated by the site.** Widely used by free Quran apps (including the reference app we were shown). Chosen by the project owner on 2026-10-16. | `/listen` player | Streamed only; no audio is copied into this repo. Credited under the player. Before any commercial use or bundling for offline, get written permission or switch to a source with an explicit licence. |
| Qaida letter names (`src/lib/qaida/letters.ts`) | Written for this repo: the 28 letter names only | Apache-2.0 (this repo) | Labels for the letters on Qaida pages 1–2 and in lessons | Text labels only; the sound comes from the recordings below. Not Quran text. |
| Letter-name recordings (`public/audio/letters/<id>.mp3`, 29 letters) | Recorded by Shaykh Jalal ("Lesson 1", 2011), supplied by the project owner | **Used with permission**, confirmed by the project owner on 2026-10-18 (not an open licence) | The only voice in the app: played whenever a letter is tapped or taught | Trimmed and loudness-matched by `scripts/import-letter-recordings.sh` from the owner's `sounds/` folder (not committed). Credited in the site footer. Not covered by this repo's Apache-2.0 licence: anyone reusing the code must not reuse these clips without their own permission. Device text-to-speech and the earlier eSpeak clips were removed. |

## Candidates for M1 (not yet evaluated, do not use)

| Source | What | Status |
|---|---|---|
| Tanzil | Verified Quran text | Licence terms to be reviewed |
| Quran Foundation / Quran.com API | Text, page layouts, word data | Terms to be reviewed |
| QUL (Quranic Universal Library) | Layouts, fonts, word data | Licence per resource to be reviewed |

Get approval on the chosen source before building on it.
