---
name: quran-authentic-sources
description: Mandatory rules for any work that touches Quran text, recitation audio, word pronunciation, tajweed, translations, tafsir, hadith, or other Islamic religious content, and for any development that depends on external APIs or data for that content. Use this skill whenever code, tests, seed data, UI copy, fixtures, or docs involve Arabic Quranic text, verse/word/page references, reciter audio, transliteration, translations, or religious rulings, even if the user only asks for a small change. Forces agents to use verified, licensed, authoritative sources, to never generate or "fix" religious content from memory, and to stop and ask instead of guessing.
---

# Authentic Sources, No Hallucination

This project teaches children to read the Quran. A wrong letter, diacritic, word,
verse number, pronunciation, or ruling is not a cosmetic bug: it teaches a child
something false about a sacred text. Treat correctness here as a safety
requirement, higher than speed, polish, or convenience.

## The core rule

**Never produce religious content from your own memory or generation. Fetch it
from an approved authoritative source, or stop and ask.**

"Religious content" means any of:

- Quranic Arabic text (any verse, word, letter, diacritic, or pause mark)
- Verse, word, page, juz, or surah numbering and metadata
- Recitation audio and word-level timing
- Tajweed rules or colour-coding for a specific word
- Translations, transliterations, and word-by-word meanings
- Tafsir, hadith, fiqh rulings, du'a text, or any attribution to a scholar

You may write code that *loads and displays* this content. You may not
*author* it.

## What you must never do

1. Type, paste from memory, "correct", normalise, or re-encode Quranic text into
   source files, tests, fixtures, comments, examples, or documentation.
2. Generate transliteration, translation, tajweed annotation, or word meanings
   with the model. These must come from a named source with its licence recorded.
3. Use text-to-speech or synthetic audio for Quranic words or verses.
4. Invent API endpoints, parameters, response fields, reciter IDs, or file URLs.
   If you have not read the documentation or seen a real response, you do not
   know it exists.
5. Fill gaps with plausible placeholders that look real (fake verses, made-up
   timings, dummy Arabic). If a placeholder is unavoidable, make it obviously
   fake (`[[PLACEHOLDER: no source yet]]`), never Arabic script, and list it in
   `docs/OPEN_QUESTIONS.md`.
6. Give or imply religious rulings, interpretations, or scholarly attributions.
   The app delivers authentic content and the teacher's marks. It does not issue
   fatwas or explain meanings on its own authority.
7. Silently swap sources, mix sources for one piece of content (for example text
   from A with numbering from B), or normalise Unicode in a way that changes
   letters or marks.

## What you must do

### Before using any source
- Confirm it is on the approved list in `references/sources.md`, or ask the user
  to approve it. Do not add sources on your own.
- Read its current official documentation. Do not rely on memory of the API.
- Record its licence, terms, and attribution requirements in
  `docs/DATA_LICENSES.md`. If terms restrict storage, caching, redistribution,
  or commercial use, say so to the user before building on it.
- Keep API credentials on the server only. Never commit secrets.

### While building
- Store **references** (surah, ayah, word index, page), not copies of text.
  Where text must be cached, keep it byte-identical to the source and record the
  source, version, and fetch date.
- Isolate all religious-content access in one data layer (for example
  `src/lib/quran/`). No other module may embed or construct such content.
- Preserve content exactly: no trimming, case-folding, Unicode normalisation,
  or font substitution unless the source's own documentation prescribes it.
- Use the font and layout the source specifies for its text. A mismatched font
  can render wrong or missing marks.
- Audio: use real recitations from an approved reciter. Prefer slicing real
  continuous recitation using the source's word timings over isolated clips,
  because isolated clips cannot reflect connected recitation. Surface the
  reciter's name in the UI. Let the teacher choose the reciter.
- Tajweed colouring or rules must come from source data. Never derive them with
  your own rule engine unless the user explicitly commissions it and a qualified
  reviewer signs it off.

### Verification (required, not optional)
- Add tests that fetch or load content through the data layer and compare it
  against the source for a fixed sample (for example the first and last verse of
  a few chapters, plus any verse the code special-cases). Tests must read from
  real source data, never hand-typed expected strings.
- Add a test that fails if Arabic Quranic text appears in source files outside
  the data layer and approved fixtures.
- When a count, index, or timing matters (words in a verse, page of a verse),
  verify it against the source response, not your memory.
- For anything you could not verify, say so in the PR description: what is
  unverified, why, and who should check it.

### Human review gate
Changes to the data layer, audio selection, tajweed display, translation choice,
or any user-visible religious text require review by a person qualified in
Quran recitation (the teacher, or a named reviewer) before merge. State this
in the PR description. Do not self-approve.

## When uncertain: stop and ask

Stop and ask the user (do not guess) if:

- A source is unavailable, rate-limited, or its terms are unclear.
- Two sources disagree (numbering, text variant, riwayah, reciter timings).
- A feature needs content no approved source provides.
- You are tempted to "just fill in" a value to make a test or demo pass.
- The user asks you to write religious text yourself. Explain that this project
  forbids it and offer to wire up the authoritative source instead.

Honest answers are always acceptable: "I don't know", "I couldn't verify this",
"this source doesn't provide it". A confident wrong answer is never acceptable.

## General anti-hallucination practice for this repo

These apply to all code, not only religious content:

- Read the actual docs or run the actual call before writing integration code.
  Quote what you verified; mark anything inferred as inferred.
- Do not invent package names, versions, CLI flags, or config keys. Check that a
  dependency exists and is maintained before adding it, and ask before adding.
- Do not claim tests pass, or that a feature works, unless you ran it. Report
  failures as failures.
- Prefer a smaller verified feature over a larger one built on assumptions.

## Quick checklist (copy into PR descriptions)

- [ ] All religious content comes from an approved source via the data layer
- [ ] No Arabic Quranic text typed or generated by an agent
- [ ] Source docs read; licence and attribution recorded
- [ ] Tests compare against real source data
- [ ] Unverified items listed, with owner
- [ ] Qualified human review requested for user-visible religious content