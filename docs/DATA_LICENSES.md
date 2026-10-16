# Data and font licences

Every text, font, or page-image source must be listed here with its licence before it
is used. If unsure, stop and ask.

## In use

| Asset | Source | Licence | Where | Notes |
|---|---|---|---|---|
| Placeholder reading text | Generated in this repo (`src/lib/quran/placeholder-source.ts`) | Apache-2.0 (this repo) | Reading view until M1 | Generic Arabic words ("word", "example", "text", "test"). **Not Quran text.** |
| Geist, Geist Mono (UI font) | Vercel, via `next/font/google` (self-hosted at build time) | SIL Open Font License 1.1 | App chrome | No runtime requests to Google. |
| Arabic stand-in font | Operating-system fonts only (CSS stack) | n/a, nothing shipped | Reading view until M1 | Replace with a licensed Quranic font in M1. |

## Candidates for M1 (not yet evaluated, do not use)

| Source | What | Status |
|---|---|---|
| Tanzil | Verified Quran text | Licence terms to be reviewed |
| Quran Foundation / Quran.com API | Text, page layouts, word data | Terms to be reviewed |
| QUL (Quranic Universal Library) | Layouts, fonts, word data | Licence per resource to be reviewed |

Get approval on the chosen source before building on it.
