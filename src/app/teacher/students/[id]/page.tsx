import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { AssignmentList, SessionList } from "@/components/lists";
import { ProgressExplorer } from "@/components/progress/PageGrid";
import { ProgressStats } from "@/components/progress/ProgressStats";
import { TrendChart } from "@/components/progress/TrendChart";
import { TeacherNoteForm } from "@/components/teacher/forms";
import { getPreviewState } from "@/lib/preview";
import { BOOK_LABEL, bookPageCount } from "@/lib/books";
import { formatDate } from "@/lib/format";
import {
  CURRENT,
  classForStudent,
  getProgressForStudent,
  getStudentForTeacher,
  getTeacherNotes,
  listAssignmentsForStudent,
  listSessionsForStudent,
  marksForSession,
  weeklyTrend,
} from "@/lib/mock/repo";

export const metadata: Metadata = { title: "Student progress" };

export default function Page(props: PageProps<"/teacher/students/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading student" rows={4} />}>
      <StudentScreen {...props} />
    </Suspense>
  );
}

async function StudentScreen({ params, searchParams }: PageProps<"/teacher/students/[id]">) {
  const [{ id }, state] = await Promise.all([params, getPreviewState(searchParams)]);
  if (state === "loading") return <LoadingBlock label="Loading student" rows={4} />;
  if (state === "error") return <ErrorState description="We couldn’t load this student’s progress." />;

  // Mirrors RLS: no approved membership in one of my classes -> the row does not exist for me.
  const student = getStudentForTeacher(CURRENT.teacherId, id);
  if (!student) notFound();

  const empty = state === "empty";
  const cls = classForStudent(CURRENT.teacherId, student.id);
  const book = cls?.book ?? "quran";
  const pageCount = bookPageCount(book);
  const progress = empty ? [] : [...getProgressForStudent(student.id, book).values()];
  const sessions = empty ? [] : listSessionsForStudent(student.id).filter((s) => s.teacherId === CURRENT.teacherId);
  const assignments = empty ? [] : listAssignmentsForStudent(student.id);
  const notes = empty ? [] : getTeacherNotes(CURRENT.teacherId, student.id);

  return (
    <>
      <PageHeader
        back={
          <Link
            href={`/teacher/classes/${cls?.id ?? "c1"}`}
            className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg"
          >
            <Icon name="chevronLeft" size={16} /> {cls?.name ?? "Class"}
          </Link>
        }
        title={student.nickname}
        description={`${BOOK_LABEL[book]} · progress, assignments, and your private notes.`}
        actions={<ButtonLink href="/teacher" icon="play">Start session</ButtonLink>}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No progress yet"
          description={`After your first session with ${student.nickname}, pages and marks will show up here automatically.`}
        />
      ) : (
        <div className="space-y-6">
          <ProgressStats progress={progress} pageCount={pageCount} />
          <Card>
            <CardHeader
              title={`${BOOK_LABEL[book]} pages`}
              description="Each square is one page. Choose a page to change its status."
            />
            <ProgressExplorer book={book} pageCount={pageCount} progress={progress} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Trend" description="Average marks per session, last 6 weeks" />
              <TrendChart buckets={weeklyTrend(student.id, book)} />
            </Card>
            <Card>
              <CardHeader title="Assignments" />
              {assignments.length ? <AssignmentList assignments={assignments} /> : <p className="text-muted">None yet.</p>}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Recent sessions" />
              <SessionList
                sessions={sessions.slice(0, 6)}
                marksFor={marksForSession}
                hrefFor={(s) => `/teacher/sessions/${s.id}`}
              />
            </Card>
            <Card>
              <CardHeader
                title="Private notes"
                description={
                  <span className="inline-flex items-center gap-1">
                    <Icon name="lock" size={14} /> Only you can see these
                  </span>
                }
              />
              <ul className="mb-5 space-y-3">
                {notes.map((n) => (
                  <li key={n.at} className="rounded-xl bg-surface-2 p-3">
                    <p>{n.text}</p>
                    <p className="mt-1 text-xs text-muted">{formatDate(n.at)}</p>
                  </li>
                ))}
              </ul>
              <TeacherNoteForm label="Add a note" />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
