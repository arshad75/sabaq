import type {
  Assignment,
  Book,
  ClassMember,
  ClassRoom,
  LessonSession,
  Mark,
  MarkType,
  PageProgress,
  Profile,
  Student,
} from "@/lib/domain/types";
import { buildPlaceholderPage } from "@/lib/quran/placeholder-source";

// Fixed clock so mock screens render deterministically (and prerender cleanly).
export const MOCK_NOW = "2026-10-16T09:00:00.000Z";
export const MOCK_TODAY = MOCK_NOW.slice(0, 10);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysAgo(days: number, hourUtc = 9): string {
  const d = new Date(MOCK_NOW);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export const profiles: Profile[] = [
  { id: "t1", role: "teacher", displayName: "Ustadha Amina", locale: "en" },
  { id: "t2", role: "teacher", displayName: "Ustadh Bilal", locale: "en" },
  { id: "g1", role: "guardian", displayName: "Sara", locale: "en" },
  { id: "g2", role: "guardian", displayName: "Omar", locale: "en" },
];

export const students: Student[] = [
  { id: "s1", guardianId: "g1", nickname: "Maryam", loginMethod: "pin", recordingConsent: false },
  { id: "s2", guardianId: "g1", nickname: "Yusuf", loginMethod: "magic_link", recordingConsent: false },
  { id: "s3", guardianId: "g2", nickname: "Huda", loginMethod: "pin", recordingConsent: false },
  { id: "s4", guardianId: "g2", nickname: "Zayd", loginMethod: "pin", recordingConsent: false },
  { id: "s5", guardianId: "g2", nickname: "Ali", loginMethod: "pin", recordingConsent: false },
  { id: "s6", guardianId: "g1", nickname: "Sumayya", loginMethod: "pin", recordingConsent: false },
];

export const classes: ClassRoom[] = [
  { id: "c1", teacherId: "t1", name: "Evening hifz group", book: "quran" },
  { id: "c2", teacherId: "t1", name: "Weekend Qaida", book: "qaida" },
  { id: "c3", teacherId: "t2", name: "Morning recitation", book: "quran" },
];

export const classMembers: ClassMember[] = [
  { id: "m1", classId: "c1", studentId: "s1", status: "approved", approvedByGuardianAt: daysAgo(60), inviteExpiresAt: null },
  { id: "m2", classId: "c1", studentId: "s2", status: "approved", approvedByGuardianAt: daysAgo(45), inviteExpiresAt: null },
  { id: "m3", classId: "c1", studentId: "s3", status: "approved", approvedByGuardianAt: daysAgo(30), inviteExpiresAt: null },
  { id: "m4", classId: "c1", studentId: "s5", status: "invited", approvedByGuardianAt: null, inviteExpiresAt: daysAgo(-5) },
  { id: "m5", classId: "c3", studentId: "s4", status: "approved", approvedByGuardianAt: daysAgo(20), inviteExpiresAt: null },
  { id: "m6", classId: "c3", studentId: "s2", status: "invited", approvedByGuardianAt: null, inviteExpiresAt: daysAgo(-2) },
  { id: "m7", classId: "c2", studentId: "s6", status: "approved", approvedByGuardianAt: daysAgo(25), inviteExpiresAt: null },
];

const TEACHER_NOTES = [
  "Good focus today. Watch the madd lengths.",
  "Confident on the first half; second half needs another pass.",
  "Lovely recitation. Ready for the next page.",
  "Mixed up similar ayahs again; revise slowly with the mushaf open.",
  "",
];

function buildSessionsAndMarks() {
  const rand = mulberry32(7);
  const sessions: LessonSession[] = [];
  const marks: Mark[] = [];
  const plan: { studentId: string; classId: string; teacherId: string; book: Book; count: number; startPage: number }[] = [
    { studentId: "s1", classId: "c1", teacherId: "t1", book: "quran", count: 12, startPage: 1 },
    { studentId: "s2", classId: "c1", teacherId: "t1", book: "quran", count: 8, startPage: 40 },
    { studentId: "s3", classId: "c1", teacherId: "t1", book: "quran", count: 5, startPage: 582 },
    { studentId: "s4", classId: "c3", teacherId: "t2", book: "quran", count: 6, startPage: 10 },
    { studentId: "s6", classId: "c2", teacherId: "t1", book: "qaida", count: 7, startPage: 1 },
  ];
  const errorTypes: MarkType[] = ["repeat", "pronunciation", "tajweed", "slip"];
  let roomSeq = 0;

  for (const p of plan) {
    const lastPage = p.book === "qaida" ? 39 : 604;
    let page = p.startPage;
    for (let i = 0; i < p.count; i++) {
      const id = `${p.studentId}-sess-${i + 1}`;
      const startedAt = daysAgo((p.count - i) * 3 + (p.studentId === "s1" ? 0 : 1), 9 + (i % 3));
      // Each session revisits the previous page and reads one or two new ones.
      const pagesCovered = [Math.max(p.startPage, page - 1), page, page + 1].filter(
        (v, idx, arr) => arr.indexOf(v) === idx && v <= lastPage,
      );
      page = Math.min(lastPage, page + (rand() > 0.4 ? 2 : 1));
      sessions.push({
        id,
        classId: p.classId,
        teacherId: p.teacherId,
        studentId: p.studentId,
        roomCode: `R${String(++roomSeq).padStart(5, "0")}`,
        book: p.book,
        startedAt,
        endedAt: addMinutes(startedAt, 20 + Math.floor(rand() * 20)),
        teacherNote: TEACHER_NOTES[Math.floor(rand() * TEACHER_NOTES.length)],
        pagesCovered,
      });
      let n = 0;
      for (const pg of pagesCovered) {
        const words = p.book === "quran" ? buildPlaceholderPage(pg).lines.flatMap((l) => l.words) : [];
        const pick = () => {
          if (p.book === "qaida") {
            const point = { x: 0.15 + rand() * 0.7, y: 0.2 + rand() * 0.7 };
            return { book: p.book, page: pg, surah: null, ayah: null, wordIndex: null, ...point };
          }
          const w = words[Math.floor(rand() * words.length)];
          return { book: p.book, page: pg, surah: w.surah, ayah: w.ayah, wordIndex: w.wordIndex, x: null, y: null };
        };
        const errors = Math.floor(rand() * rand() * 6);
        for (let e = 0; e < errors; e++) {
          marks.push({
            id: `${id}-m${++n}`,
            sessionId: id,
            studentId: p.studentId,
            markType: errorTypes[Math.floor(rand() * errorTypes.length)],
            ...pick(),
            note: null,
            createdBy: p.teacherId,
          });
        }
        if (rand() > 0.5) {
          marks.push({
            id: `${id}-m${++n}`,
            sessionId: id,
            studentId: p.studentId,
            markType: "good",
            ...pick(),
            note: null,
            createdBy: p.teacherId,
          });
        }
      }
    }
  }
  return { sessions, marks };
}

const built = buildSessionsAndMarks();
export const sessions: LessonSession[] = built.sessions;
export const marks: Mark[] = built.marks;

// One lesson is live right now so the teacher dashboard can show "Live now".
sessions.push({
  id: "s1-live",
  classId: "c1",
  teacherId: "t1",
  studentId: "s1",
  roomCode: "K7M2QX",
  book: "quran",
  startedAt: addMinutes(MOCK_NOW, -6),
  endedAt: null,
  teacherNote: "",
  pagesCovered: [],
});

export const progressOverrides: PageProgress[] = [
  { studentId: "s1", book: "quran", page: 3, status: "solid", source: "teacher_override", updatedAt: daysAgo(4) },
];

export const assignments: Assignment[] = [
  { id: "a1", studentId: "s1", teacherId: "t1", kind: "new", book: "quran", fromPage: 19, toPage: 20, dueOn: MOCK_TODAY, status: "assigned", teacherFeedback: null },
  { id: "a2", studentId: "s1", teacherId: "t1", kind: "recent_revision", book: "quran", fromPage: 14, toPage: 18, dueOn: MOCK_TODAY, status: "assigned", teacherFeedback: null },
  { id: "a3", studentId: "s1", teacherId: "t1", kind: "old_revision", book: "quran", fromPage: 1, toPage: 5, dueOn: daysAgo(-2).slice(0, 10), status: "assigned", teacherFeedback: null },
  { id: "a4", studentId: "s1", teacherId: "t1", kind: "new", book: "quran", fromPage: 17, toPage: 18, dueOn: daysAgo(3).slice(0, 10), status: "completed", teacherFeedback: "Well done, smooth reading." },
  { id: "a5", studentId: "s1", teacherId: "t1", kind: "recent_revision", book: "quran", fromPage: 9, toPage: 12, dueOn: daysAgo(6).slice(0, 10), status: "needs_more_work", teacherFeedback: "Page 11 needs another look." },
  { id: "a6", studentId: "s2", teacherId: "t1", kind: "new", book: "quran", fromPage: 52, toPage: 53, dueOn: daysAgo(-1).slice(0, 10), status: "assigned", teacherFeedback: null },
  { id: "a7", studentId: "s3", teacherId: "t1", kind: "old_revision", book: "quran", fromPage: 582, toPage: 585, dueOn: MOCK_TODAY, status: "assigned", teacherFeedback: null },
  { id: "a8", studentId: "s4", teacherId: "t2", kind: "new", book: "quran", fromPage: 22, toPage: 23, dueOn: MOCK_TODAY, status: "assigned", teacherFeedback: null },
  { id: "a9", studentId: "s6", teacherId: "t1", kind: "new", book: "qaida", fromPage: 12, toPage: 13, dueOn: MOCK_TODAY, status: "assigned", teacherFeedback: null },
  { id: "a10", studentId: "s6", teacherId: "t1", kind: "recent_revision", book: "qaida", fromPage: 8, toPage: 11, dueOn: daysAgo(-2).slice(0, 10), status: "assigned", teacherFeedback: null },
  { id: "a11", studentId: "s6", teacherId: "t1", kind: "new", book: "qaida", fromPage: 10, toPage: 11, dueOn: daysAgo(4).slice(0, 10), status: "completed", teacherFeedback: "Clear letters, good joining." },
];

/** Private teacher notes per student. Not yet in datamodels.md (see DECISIONS.md). */
export const teacherStudentNotes: { teacherId: string; studentId: string; at: string; text: string }[] = [
  { teacherId: "t1", studentId: "s1", at: daysAgo(10), text: "Responds well to short, frequent revision. Prefers starting with something she knows." },
  { teacherId: "t1", studentId: "s1", at: daysAgo(3), text: "Mixing up pages 11 and 12 openings. Practise them back to back." },
  { teacherId: "t1", studentId: "s2", at: daysAgo(5), text: "Keen but rushes. Encourage slower pace." },
  { teacherId: "t1", studentId: "s6", at: daysAgo(2), text: "Knows all single letters. Joined forms with ح and خ still confuse her." },
];
