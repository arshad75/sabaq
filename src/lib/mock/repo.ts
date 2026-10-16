// Mock data access shaped like the future Supabase queries. Every function is scoped
// to an acting user the same way RLS will be, so screens never assume wider access.
import type {
  Assignment,
  ClassMember,
  ClassRoom,
  LessonSession,
  Mark,
  MarkType,
  PageProgress,
  Profile,
  Student,
} from "@/lib/domain/types";
import { MARK_TYPES } from "@/lib/domain/types";
import { deriveProgress } from "@/lib/progress/derive";
import * as db from "./data";

export const CURRENT = { teacherId: "t1", guardianId: "g1", studentId: "s1" } as const;

export function getProfile(id: string): Profile | undefined {
  return db.profiles.find((p) => p.id === id);
}

// ---- Teacher scope ---------------------------------------------------------------

function approvedStudentIdsForTeacher(teacherId: string): Set<string> {
  const classIds = new Set(db.classes.filter((c) => c.teacherId === teacherId).map((c) => c.id));
  return new Set(
    db.classMembers.filter((m) => classIds.has(m.classId) && m.status === "approved").map((m) => m.studentId),
  );
}

export function teacherCanSeeStudent(teacherId: string, studentId: string): boolean {
  return approvedStudentIdsForTeacher(teacherId).has(studentId);
}

export function listClassesForTeacher(teacherId: string): (ClassRoom & { studentCount: number; pendingCount: number })[] {
  return db.classes
    .filter((c) => c.teacherId === teacherId)
    .map((c) => ({
      ...c,
      studentCount: db.classMembers.filter((m) => m.classId === c.id && m.status === "approved").length,
      pendingCount: db.classMembers.filter((m) => m.classId === c.id && m.status === "invited").length,
    }));
}

export type ClassMemberRow = ClassMember & {
  /** Only populated for approved members; invited students stay opaque to the teacher. */
  student: Pick<Student, "id" | "nickname"> | null;
  lastSessionAt: string | null;
};

export function getClassForTeacher(teacherId: string, classId: string) {
  const cls = db.classes.find((c) => c.id === classId && c.teacherId === teacherId);
  if (!cls) return undefined;
  const members: ClassMemberRow[] = db.classMembers
    .filter((m) => m.classId === classId && m.status !== "revoked")
    .map((m) => {
      const s = db.students.find((st) => st.id === m.studentId);
      const last = latestSession(m.studentId, teacherId);
      return {
        ...m,
        student: m.status === "approved" && s ? { id: s.id, nickname: s.nickname } : null,
        lastSessionAt: m.status === "approved" ? (last?.endedAt ?? last?.startedAt ?? null) : null,
      };
    });
  return { cls, members };
}

export function listStudentsForTeacher(teacherId: string): Student[] {
  const ids = approvedStudentIdsForTeacher(teacherId);
  return db.students.filter((s) => ids.has(s.id));
}

export function getStudentForTeacher(teacherId: string, studentId: string): Student | undefined {
  if (!teacherCanSeeStudent(teacherId, studentId)) return undefined;
  return db.students.find((s) => s.id === studentId);
}

function latestSession(studentId: string, teacherId?: string): LessonSession | undefined {
  return db.sessions
    .filter((s) => s.studentId === studentId && (!teacherId || s.teacherId === teacherId))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

export function listSessionsForTeacher(teacherId: string): (LessonSession & { student: Student })[] {
  const ids = approvedStudentIdsForTeacher(teacherId);
  return db.sessions
    .filter((s) => s.teacherId === teacherId && ids.has(s.studentId))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((s) => ({ ...s, student: db.students.find((st) => st.id === s.studentId)! }));
}

export function getTeacherNotes(teacherId: string, studentId: string) {
  if (!teacherCanSeeStudent(teacherId, studentId)) return [];
  return db.teacherStudentNotes
    .filter((n) => n.teacherId === teacherId && n.studentId === studentId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function studentsNeedingAttention(teacherId: string) {
  return listStudentsForTeacher(teacherId)
    .map((s) => {
      const progress = getProgressForStudent(s.id);
      const needsWork = [...progress.values()].filter((p) => p.status === "needs_work").map((p) => p.page);
      return { student: s, needsWorkPages: needsWork };
    })
    .filter((r) => r.needsWorkPages.length > 0)
    .sort((a, b) => b.needsWorkPages.length - a.needsWorkPages.length);
}

// ---- Shared (callers must already be authorised for the student) ----------------

export function getSession(id: string): (LessonSession & { student: Student; teacher: Profile }) | undefined {
  const s = db.sessions.find((x) => x.id === id);
  if (!s) return undefined;
  return { ...s, student: db.students.find((st) => st.id === s.studentId)!, teacher: getProfile(s.teacherId)! };
}

export function getSessionForTeacher(teacherId: string, id: string) {
  const s = getSession(id);
  return s && s.teacherId === teacherId && teacherCanSeeStudent(teacherId, s.studentId) ? s : undefined;
}

export function getSessionForGuardian(guardianId: string, id: string) {
  const s = getSession(id);
  return s && s.student.guardianId === guardianId ? s : undefined;
}

export function listSessionsForStudent(studentId: string): LessonSession[] {
  return db.sessions
    .filter((s) => s.studentId === studentId && s.endedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function marksForSession(sessionId: string): Mark[] {
  return db.marks.filter((m) => m.sessionId === sessionId);
}

export function countMarksByType(marks: Pick<Mark, "markType">[]): Record<MarkType, number> {
  const counts = Object.fromEntries(MARK_TYPES.map((t) => [t, 0])) as Record<MarkType, number>;
  for (const m of marks) counts[m.markType]++;
  return counts;
}

export function getProgressForStudent(studentId: string): Map<number, PageProgress> {
  const ss = listSessionsForStudent(studentId).map((s) => ({
    sessionId: s.id,
    startedAt: s.startedAt,
    pagesCovered: s.pagesCovered,
    marks: marksForSession(s.id),
  }));
  return deriveProgress(
    studentId,
    ss,
    db.progressOverrides.filter((o) => o.studentId === studentId),
  );
}

/** Marks per session per type, oldest first, for the weekly trend chart. */
export function weeklyTrend(studentId: string, weeks = 6) {
  const now = new Date(db.MOCK_NOW).getTime();
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    label: i === weeks - 1 ? "This week" : `${weeks - 1 - i}w ago`,
    sessions: 0,
    counts: Object.fromEntries(MARK_TYPES.map((t) => [t, 0])) as Record<MarkType, number>,
  }));
  for (const s of listSessionsForStudent(studentId)) {
    const weeksAgo = Math.floor((now - new Date(s.startedAt).getTime()) / (7 * 86_400_000));
    const idx = weeks - 1 - weeksAgo;
    if (idx < 0 || idx >= weeks) continue;
    buckets[idx].sessions++;
    for (const m of marksForSession(s.id)) buckets[idx].counts[m.markType]++;
  }
  return buckets;
}

export function listAssignmentsForStudent(studentId: string): Assignment[] {
  return db.assignments
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => b.dueOn.localeCompare(a.dueOn));
}

// ---- Guardian scope --------------------------------------------------------------

export function listChildren(guardianId: string): Student[] {
  return db.students.filter((s) => s.guardianId === guardianId);
}

export function getChild(guardianId: string, studentId: string): Student | undefined {
  return db.students.find((s) => s.id === studentId && s.guardianId === guardianId);
}

export function linkedTeachersForChild(guardianId: string, studentId: string) {
  if (!getChild(guardianId, studentId)) return [];
  return db.classMembers
    .filter((m) => m.studentId === studentId && m.status !== "revoked")
    .map((m) => {
      const cls = db.classes.find((c) => c.id === m.classId)!;
      return { membership: m, cls, teacher: getProfile(cls.teacherId)! };
    });
}

export function pendingApprovalsForGuardian(guardianId: string) {
  const childIds = new Set(listChildren(guardianId).map((c) => c.id));
  return db.classMembers
    .filter((m) => childIds.has(m.studentId) && m.status === "invited")
    .map((m) => {
      const cls = db.classes.find((c) => c.id === m.classId)!;
      return {
        membership: m,
        child: db.students.find((s) => s.id === m.studentId)!,
        cls,
        teacher: getProfile(cls.teacherId)!,
      };
    });
}

export function exportGuardianData(guardianId: string) {
  const children = listChildren(guardianId);
  return {
    exportedAt: db.MOCK_NOW,
    guardian: getProfile(guardianId),
    children: children.map((c) => {
      const sessions = listSessionsForStudent(c.id);
      return {
        profile: c,
        memberships: linkedTeachersForChild(guardianId, c.id).map((l) => ({
          class: l.cls.name,
          teacher: l.teacher.displayName,
          status: l.membership.status,
        })),
        sessions,
        marks: sessions.flatMap((s) => marksForSession(s.id)),
        pageProgress: [...getProgressForStudent(c.id).values()],
        assignments: listAssignmentsForStudent(c.id),
      };
    }),
  };
}

// ---- Student scope ---------------------------------------------------------------

export function getStudent(studentId: string): Student | undefined {
  return db.students.find((s) => s.id === studentId);
}

export function getAssignmentForStudent(studentId: string, id: string): Assignment | undefined {
  return db.assignments.find((a) => a.id === id && a.studentId === studentId);
}

export function studentStreak(studentId: string): number {
  const days = new Set(listSessionsForStudent(studentId).map((s) => s.startedAt.slice(0, 10)));
  return Math.min(days.size, 7);
}

export function liveSessionForTeacher(teacherId: string) {
  return db.sessions.find((s) => s.teacherId === teacherId && !s.endedAt);
}

export { MOCK_NOW, MOCK_TODAY } from "./data";
