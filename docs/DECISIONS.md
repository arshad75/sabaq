# Decisions

Non-obvious choices, newest first. Change the stack only with an entry here.

## 2026-10-16: Prototype sign-in for teachers, guardians and students

- **Mock auth, real shape.** Until Supabase Auth (M3), `src/lib/mock/auth.ts` and
  `src/lib/auth/` run sign-in on the server with an httpOnly session cookie. Stores are
  in memory and reset when the dev server restarts. Demo logins: `amina@example.com`
  (teacher) and `sara@example.com` (guardian), password `lesson-sync-demo`; every child's
  PIN starts as `1234`.
- **Role comes from the account.** The old login form had no role field and always
  sent people to the guardian dashboard. Login now looks the role up server-side.
- **No account discovery.** Wrong email or password gives one message; the email-link
  reply is identical for unknown emails.
- **Tablet pairing.** `/login/student` lists children only on a browser a guardian has
  set up, so a public page never shows children's names.
- **PINs.** Stored hashed; 5 wrong tries lock that child for 60 s. A 4-digit PIN is
  weak offline, so the real `pin_hash` must use a slow KDF and server-side rate limits.
- **One-time links.** Spent only when the child presses "Start", so link previews in
  WhatsApp and similar apps can't use them up. 15-minute expiry.
- **Not yet enforced:** role layouts still render without a session so the prototype
  screens stay browsable. Guardian-only actions (PIN reset, sign-in link, tablet setup)
  do require a guardian session. Route protection arrives with RLS in M3.

## 2026-10-16: Qaida lessons use the licensed Noorani Qaida page images

- **Source.** Qamar Apps' Noorani Qaida (Indian edition), CC BY-SA 4.0 (see
  `DATA_LICENSES.md`). Pages are the original embedded images, extracted by
  `scripts/extract-qaida.py`, so a "Business Use Only" stamp added when the local copy
  was re-printed to PDF is not carried over.
- **Books.** A `Book` (`quran` | `qaida`) now sits on classes (default book), sessions,
  marks, page progress and assignments. The "Weekend Qaida" class uses `qaida`; a new
  mock learner, Sumayya (`s6`), is in it.
- **Marking images.** Qaida pages are images with no word data, so the student taps
  where she is reading and the teacher taps a spot to mark. Positions and marks carry a
  `point` (x, y as fractions of the page) instead of a word. Word marks are unchanged.
  Per-line or per-cell hit areas could come later from layout data.
- **Book in live sync.** The teacher's link sets the book; the student's link may omit
  it. `sync_request` now carries the sender's state, so whichever side joins second, both
  end up with the teacher's book.
- **Dev-only `?as=s6`** previews the student screens as the Qaida learner.

## 2026-10-16: Screens before data (prototype phase)

- **Order change.** All screens in `pages.md` were built first as a clickable prototype
  on typed mock data (`screens-plan.md`), ahead of M1–M5 data work. Screens live in the
  real app so later milestones swap mocks for Supabase instead of rebuilding UI.
- **Next.js 16 + Cache Components.** The scaffold enables `cacheComponents` and
  `partialPrefetching`. Consequence: anything reading `params`, `searchParams` or
  `usePathname()` must sit inside `<Suspense>`. Pages follow one pattern: a sync
  `Page` that renders `<Suspense fallback={skeleton}>` around an async content component.
- **No Quran text yet.** `src/lib/quran/placeholder-source.ts` generates clearly fake
  Arabic tokens with realistic structure (604 pages, 15 lines, ayah numbering, 114
  surah starts). The reading view shows a "not Quran text" notice while the source is a
  placeholder. A unit test fails if two or more Arabic words appear anywhere in `src`
  outside `src/lib/quran/`.
- **No Quranic font yet.** The reading view uses a system Arabic font stack (no font
  file shipped). The real font is chosen with the text source in M1.
- **Mock data shaped like RLS.** `src/lib/mock/repo.ts` functions take the acting user
  and only return rows that user could see under the planned RLS rules (e.g. a teacher
  gets `undefined` for a student without an approved membership, which renders as 404).
  `repo.test.ts` mirrors the RLS tests M3 must add.
- **Local transport for live sync.** `src/lib/session/transport.ts` uses
  `BroadcastChannel` (tabs of one browser) behind a `SessionTransport` interface that
  Supabase Realtime Broadcast will implement in M2. `?latency=300` simulates delay.
- **Sync semantics.** Position is last-write-wins by timestamp. Marks have stable ids;
  a newer edit replaces an older one. Cleared mark ids are kept as tombstones so a late
  duplicate cannot bring a mark back. A rejoining client sends `sync_request` and merges
  the reply; each client also keeps state in `sessionStorage` so a refresh restores it.
- **One live mark per word.** Re-marking a word changes its type rather than stacking.
  The data model still allows several marks per word.
- **Room codes.** 6 characters from a 32-letter alphabet without I, O, 0, 1
  (about 1.07 billion codes). Rate limiting and expiry are M2/M6 work.
- **Dev-only state preview.** `?state=loading|empty|error` (plus session states
  `waiting|reconnecting|ended|invalid|expired`) forces a screen state. Disabled in
  production unless `NEXT_PUBLIC_SCREEN_PREVIEW=1`. Index at `/dev/screens`.
- **No UI or icon library.** Components are hand-built on Tailwind; icons are simple
  in-repo SVG paths.
- **Mock dates render in UTC** for deterministic output. Real data will use the viewer's
  time zone (teacher in India, student in Australia).
- **Guardian view of a session summary.** `pages.md` puts it at
  `/teacher/sessions/[id]` for both roles. Until auth exists, `?view=guardian` previews
  the read-only guardian version.

### Data model gaps found while building screens (to resolve before M3/M4)

- `sessions` needs a way to record pages covered (prototype uses `pagesCovered`),
  either a column or derived from persisted position events.
- Private teacher notes per student need a table (e.g. `teacher_student_notes`),
  readable only by the authoring teacher.
- Progress rule: a later read with 1–2 error marks is not specified; the prototype sets
  `in_progress`. Tune with teachers.
- Student "streak" needs a definition (prototype: distinct session days, capped at 7).

### Dev dependencies added

`vitest`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`,
`jsdom`, `@playwright/test`, `prettier`. All are on the agreed stack or directly support it.
