// Mirrors datamodels.md. Quran text is never part of these types, only references.

export type Role = "guardian" | "teacher" | "student";

export type Profile = {
  id: string;
  role: Exclude<Role, "student">;
  displayName: string;
  locale: string;
};

export type LoginMethod = "pin" | "magic_link";

export type Student = {
  id: string;
  guardianId: string;
  nickname: string;
  loginMethod: LoginMethod;
  recordingConsent: boolean;
};

export type ClassRoom = {
  id: string;
  teacherId: string;
  name: string;
};

export type MembershipStatus = "invited" | "approved" | "revoked";

export type ClassMember = {
  id: string;
  classId: string;
  studentId: string;
  status: MembershipStatus;
  approvedByGuardianAt: string | null;
  inviteExpiresAt: string | null;
};

export type LessonSession = {
  id: string;
  classId: string;
  teacherId: string;
  studentId: string;
  roomCode: string;
  startedAt: string;
  endedAt: string | null;
  teacherNote: string;
  /** Not yet in datamodels.md; needed by the session summary (see DECISIONS.md). */
  pagesCovered: number[];
};

export const MARK_TYPES = ["repeat", "pronunciation", "tajweed", "slip", "good"] as const;
export type MarkType = (typeof MARK_TYPES)[number];

export type Mark = {
  id: string;
  sessionId: string;
  studentId: string;
  markType: MarkType;
  surah: number;
  ayah: number;
  wordIndex: number;
  page: number;
  note: string | null;
  createdBy: string;
};

export const PAGE_STATUSES = ["not_started", "in_progress", "needs_work", "solid"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

export type PageProgress = {
  studentId: string;
  page: number;
  status: PageStatus;
  source: "derived" | "teacher_override";
  updatedAt: string;
};

export type AssignmentKind = "new" | "recent_revision" | "old_revision";
export type AssignmentStatus = "assigned" | "completed" | "needs_more_work";

export type Assignment = {
  id: string;
  studentId: string;
  teacherId: string;
  kind: AssignmentKind;
  fromPage: number;
  toPage: number;
  dueOn: string;
  status: AssignmentStatus;
  teacherFeedback: string | null;
};
