# Pages

Every route, who can see it, what it does, and what "done" means. Design for
tablet first (the student reads on it), then phone, then desktop.

## Route map

| Route | Role | Milestone |
|---|---|---|
| `/` | public | M0 |
| `/login`, `/signup` | public | M3 |
| `/join` | any | M2 |
| `/session/[code]` | teacher, student | M2 |
| `/guardian` | guardian | M3 |
| `/guardian/children/[id]` | guardian | M3 |
| `/guardian/children/[id]/progress` | guardian | M4 |
| `/teacher` | teacher | M3 |
| `/teacher/classes/[id]` | teacher | M3 |
| `/teacher/students/[id]` | teacher | M4 |
| `/teacher/sessions/[id]` | teacher, guardian | M4 |
| `/student` | student | M3 |
| `/student/assignments/[id]` | student | M5 |
| `/settings` | all | M3 |
| `/privacy` | public | M6 |

## Public

### `/` Landing
Short explanation, links to log in, join a session by code, and the source repo.
No tracking scripts.

### `/login`, `/signup`
Guardian and teacher sign-up with role choice. Students never sign up here; they
are created by a guardian. Empty, loading, and error states for each form.

### `/join`
Enter a 6-character room code to join a live session. Used before accounts exist
(M2) and afterwards as a quick-join. Invalid or expired code shows a clear message.

## Live session

### `/session/[code]` Live reading view (the most important page)

**Student mode (tablet):**
- Full-screen Quranic text, RTL, page-based, large type
- Tap a word to mark "I'm here"; the highlight moves with her
- Teacher marks appear inline on the words, colour-coded plus icon
- Minimal chrome: page number, connection dot, "end session"
- Page turn by swipe or arrows

**Teacher mode (phone or tablet):**
- Same page, follows the student position live (toggle "follow student" on/off)
- Tap a word to place a mark; pick type from a small palette (repeat,
  pronunciation, tajweed, slip, good)
- Tap a mark to remove or change it
- Side panel (collapsible on phone): marks list for this session, quick note field
- Connection indicator for both ends; reconnect banner

**States:** waiting for the other person, connected, reconnecting, session ended,
invalid code.
**Done when:** marks and position sync both ways within about a second on a
throttled connection, and a refresh restores everything.

## Guardian

### `/guardian` Dashboard
List of children with status cards (last session, current assignment, simple
progress ring). Buttons: add child, link a teacher, export data.

### `/guardian/children/[id]` Child profile
Nickname, PIN or magic-link management, linked teachers (approve/revoke),
recording consent toggle (default off), delete child data.

### `/guardian/children/[id]/progress`
Same progress view the teacher sees, read-only, with a plain-language summary.

## Teacher

### `/teacher` Dashboard
Today's sessions, students needing attention (many "needs work" marks), recent
sessions, button to start a session (generates a room code and shareable link).

### `/teacher/classes/[id]`
Student list, pending invites, invite link with expiry, per-student last-seen.

### `/teacher/students/[id]` Student progress
- Page grid (604 pages if using the standard Madani page layout, or the
  chosen source's page count) coloured by status
- Trend over weeks (marks per session by type)
- Assignment history
- Teacher notes (private to teacher)
- Override control to set a page's status manually

### `/teacher/sessions/[id]` Session summary
Date, duration, pages covered, all marks grouped by type with jump-to-page,
teacher note, assign follow-up homework. Visible to the linked guardian.

## Student

### `/student` Home
Big, friendly, uncluttered: today's assignment, "Start reading" button, a simple
streak or progress indicator. No chat, no free text, no other children visible.

### `/student/assignments/[id]`
What to read or revise (range), due date, status, and a button that opens the
reading view at the right page.

## Shared

### `/settings`
Language, text size, mark colours and icons, notification preferences, sign out.

### `/privacy`
Plain-language list of what is stored, who can see it, how to export and delete.

## UI requirements across all pages

- RTL-correct Arabic text; LTR for UI chrome (with an option for RTL UI languages later)
- Touch targets at least 44px; works with large text
- Never rely on colour alone (pair with icon or label)
- Fast on a low-end Android phone on a poor connection
- Every page has loading, empty, and error states
- Light and dark mode; the reading view also offers a sepia/paper theme