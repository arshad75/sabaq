import Link from "next/link";
import type { Assignment, LessonSession, Mark } from "@/lib/domain/types";
import {
  ASSIGNMENT_KIND_LABEL,
  ASSIGNMENT_STATUS,
  durationMinutes,
  formatDate,
  formatDateLong,
  pageRange,
  relativeDays,
} from "@/lib/format";
import { countMarksByType } from "@/lib/mock/repo";
import { MOCK_NOW } from "@/lib/mock/data";
import { MARK_TYPES } from "@/lib/domain/types";
import { Badge } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { MarkChip } from "@/components/ui/Indicators";

export function AssignmentList({
  assignments,
  hrefFor,
  showFeedback = true,
}: {
  assignments: Assignment[];
  hrefFor?: (a: Assignment) => string;
  showFeedback?: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {assignments.map((a) => {
        const st = ASSIGNMENT_STATUS[a.status];
        const body = (
          <div className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {ASSIGNMENT_KIND_LABEL[a.kind]} · {pageRange(a.fromPage, a.toPage)}
              </p>
              <p className="text-sm text-muted">
                Due {formatDate(a.dueOn)} ({relativeDays(a.dueOn, MOCK_NOW)})
              </p>
              {showFeedback && a.teacherFeedback && <p className="mt-1 text-sm">“{a.teacherFeedback}”</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={st.tone}>{st.label}</Badge>
              {hrefFor && <Icon name="chevronRight" className="text-muted" />}
            </div>
          </div>
        );
        return (
          <li key={a.id}>
            {hrefFor ? (
              <Link href={hrefFor(a)} className="-mx-2 block rounded-xl px-2 hover:bg-surface-2">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SessionList({
  sessions,
  marksFor,
  hrefFor,
  nameFor,
}: {
  sessions: LessonSession[];
  marksFor: (id: string) => Mark[];
  hrefFor: (s: LessonSession) => string;
  nameFor?: (s: LessonSession) => string;
}) {
  return (
    <ul className="divide-y divide-border">
      {sessions.map((s) => {
        const counts = countMarksByType(marksFor(s.id));
        const mins = durationMinutes(s.startedAt, s.endedAt);
        return (
          <li key={s.id}>
            <Link href={hrefFor(s)} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-surface-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {nameFor ? `${nameFor(s)} · ` : ""}
                  {formatDateLong(s.startedAt)}
                </p>
                <p className="text-sm text-muted">
                  {s.pagesCovered.length ? pageRange(Math.min(...s.pagesCovered), Math.max(...s.pagesCovered)) : "No pages"}
                  {mins !== null && ` · ${mins} min`}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {MARK_TYPES.filter((t) => counts[t] > 0).map((t) => (
                    <MarkChip key={t} type={t} count={counts[t]} compact />
                  ))}
                </div>
              </div>
              <Icon name="chevronRight" className="shrink-0 text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
