# Screens-first plan (built 2026-10-16, awaiting review)

Goal: build every screen in `pages.md` as a clickable, responsive prototype backed by
typed mock data, before wiring Supabase/Realtime. Screens are built in the real
Next.js app (not throwaway), so later milestones swap mocks for real data.

This changes the order in `plan.md` (UI ahead of M1–M5 data work). Record it in
`docs/DECISIONS.md` once approved.

## Ground rules for this phase

- **No Quran text.** Until a source is licence-approved (M1), the reading view uses
  clearly fake placeholder tokens (e.g. `كلمة ١`, `كلمة ٢` …) from a mock adapter in
  `src/lib/quran/`. Same interface the real source will use: page → lines → words
  with `{ surah, ayah, word_index, page }` references.
- **No Quranic font yet.** Use a generic Arabic UI font as a stand-in; real font
  chosen with the data source in M1 and recorded in `DATA_LICENSES.md`.
- Mock data types mirror `datamodels.md` exactly (`Student`, `Session`, `Mark`,
  `PageProgress`, `Assignment`, …) so they become the real types later.
- No student birthdates, photos, or free-text fields even in mocks.
- Every screen ships with loading, empty, and error states, viewable via a dev-only
  `?state=loading|empty|error` query param.

## S0: Minimal scaffold (subset of M0)

- [x] Next.js (App Router) + TypeScript + Tailwind, ESLint, Prettier
- [x] Vitest + Testing Library; Playwright with 3 viewports:
      tablet portrait 768×1024, tablet landscape 1024×768, phone 390×844
- [x] `pnpm dev`, `pnpm test`, `pnpm test:e2e` working
- [ ] Docs moved/created under `docs/` to match `Claude.md` docs map
      (created `docs/DECISIONS.md`, `docs/DATA_LICENSES.md`; existing root docs not moved yet)

## S1: Design system and shared components

- [x] Theme tokens: light, dark, and sepia/paper (reading view only)
- [x] Mark type config: repeat, pronunciation, tajweed, slip, good — each with
      colour **and** icon **and** label (never colour alone)
- [x] Components: `Button`, `Card`, `Badge`, `ConnectionDot`, `MarkChip`,
      `MarkPalette`, `ProgressRing`, `PageGrid`, `Skeleton`, `EmptyState`,
      `ErrorState`, `Banner` (reconnect), code input (inside `JoinForm`)
- [x] Role app shells: `AppShell` (guardian, teacher), minimal student layout
- [x] All touch targets ≥ 44px; component tests for a11y labels

## S2: Live session (highest priority)

- [x] `ReadingView`: RTL, page-based lines, large type, word tap → highlight,
      inline marks (colour + icon), swipe/arrow page turn
- [x] `/session/[code]` **student mode**: full-screen text, page no., connection
      dot, end session
- [x] `/session/[code]` **teacher mode**: follow-student toggle, tap word → mark
      palette, tap mark → change/remove, collapsible side panel (marks list +
      note), connection indicators for both ends
- [x] States: waiting, connected, reconnecting, ended, invalid code
- [x] Local simulated sync (two tabs via `BroadcastChannel`) so the flow is demoable
      before Supabase; behind the same interface Realtime will implement later
- [x] `/join`: code entry, invalid/expired message

## S3: Public

- [x] `/` landing (no tracking scripts)
- [x] `/login`, `/signup` with role choice (guardian | teacher); form states

## S4: Student

- [x] `/student` home: today's assignment, Start reading, simple streak
- [x] `/student/assignments/[id]`: range, due date, status, open reading view

## S5: Teacher

- [x] `/teacher` dashboard: today's sessions, needs-attention, recent, start session
- [x] `/teacher/classes/[id]`: students, pending invites, invite link + expiry
- [x] `/teacher/students/[id]`: page grid heat map, weekly trend, assignments,
      private notes, page status override
- [x] `/teacher/sessions/[id]`: summary, marks by type, jump-to-page, note,
      assign follow-up

## S6: Guardian

- [x] `/guardian` dashboard: child cards, add child, link teacher, export
- [x] `/guardian/children/[id]`: nickname, PIN/magic link, teachers
      approve/revoke, recording consent (default off), delete data
- [x] `/guardian/children/[id]/progress`: read-only progress + plain summary

## S7: Shared

- [x] `/settings`: language, text size, mark colours/icons (legend only, not yet
      customisable), notifications, sign out
- [x] `/privacy`: what is stored, who sees it, export/delete

## Done when

Every route in `pages.md` renders on all 3 viewports with loading/empty/error
states; Playwright screenshot tests pass; the session screen is demoable in two tabs
(student moves → teacher follows, teacher marks → student sees).

## Dependencies to approve

| Package | Why | Licence |
|---|---|---|
| next, react, react-dom, typescript | stack | MIT / Apache-2.0 |
| tailwindcss | stack | MIT |
| vitest, @testing-library/react, jsdom | unit tests | MIT |
| @playwright/test | e2e + screenshots | Apache-2.0 |
| eslint, prettier | lint/format | MIT |
| lucide-react (optional) | mark/UI icons | ISC |
| clsx (optional) | class names | MIT |

No component library proposed; components are hand-built on Tailwind.
