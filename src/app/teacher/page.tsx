import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { SessionList } from "@/components/lists";
import { StartSession } from "@/components/teacher/StartSession";
import { getPreviewState } from "@/lib/preview";
import { formatTime } from "@/lib/format";
import {
  CURRENT,
  getProfile,
  getStudent,
  listClassesForTeacher,
  listSessionsForTeacher,
  listStudentsForTeacher,
  liveSessionForTeacher,
  marksForSession,
  primaryBookForStudent,
  studentsNeedingAttention,
} from "@/lib/mock/repo";
import { MOCK_TODAY } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Teacher" };

export default function Page(props: PageProps<"/teacher">) {
  const me = getProfile(CURRENT.teacherId)!;
  return (
    <>
      <PageHeader title={`Assalamu alaikum, ${me.displayName}`} description="Here is your teaching day." />
      <Suspense fallback={<LoadingBlock label="Loading dashboard" />}>
        <Dashboard searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/teacher">, "searchParams">) {
  const state = await getPreviewState(searchParams);
  if (state === "loading") return <LoadingBlock label="Loading dashboard" />;
  if (state === "error") return <ErrorState description="We couldn’t load your dashboard. Your data is safe; try again." />;

  const t = CURRENT.teacherId;
  const empty = state === "empty";
  const students = empty ? [] : listStudentsForTeacher(t);
  const classes = empty ? [] : listClassesForTeacher(t);

  if (students.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="No students yet"
        description="Create a class and send an invite link. A guardian approves it before you can see their child."
        action={<ButtonLink href="/teacher/classes/c1" icon="plus">Create a class</ButtonLink>}
      />
    );
  }

  const live = liveSessionForTeacher(t);
  const liveStudent = live ? getStudent(live.studentId) : undefined;
  const sessions = listSessionsForTeacher(t).filter((s) => s.endedAt);
  const todays = sessions.filter((s) => s.startedAt.startsWith(MOCK_TODAY));
  const attention = studentsNeedingAttention(t);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {live && liveStudent && (
          <Card className="border-primary/40 bg-primary-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone="success" icon="wifi">
                  Live now
                </Badge>
                <p className="mt-2 text-lg font-semibold">
                  {liveStudent.nickname} · started {formatTime(live.startedAt)} UTC
                </p>
                <p className="text-sm text-muted">
                  Room <span className="font-mono tracking-widest">{live.roomCode}</span>
                </p>
              </div>
              <ButtonLink href={`/session/${live.roomCode}?role=teacher&book=${live.book}`} icon="play">
                Rejoin
              </ButtonLink>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Today" description={`${todays.length} finished · ${live ? 1 : 0} live`} />
          {todays.length === 0 ? (
            <p className="text-muted">No finished sessions yet today.</p>
          ) : (
            <SessionList
              sessions={todays}
              marksFor={marksForSession}
              hrefFor={(s) => `/teacher/sessions/${s.id}`}
              nameFor={(s) => getStudent(s.studentId)?.nickname ?? ""}
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Recent sessions" />
          <SessionList
            sessions={sessions.slice(0, 5)}
            marksFor={marksForSession}
            hrefFor={(s) => `/teacher/sessions/${s.id}`}
            nameFor={(s) => getStudent(s.studentId)?.nickname ?? ""}
          />
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Start a session" description="Creates a room code to share." />
          <StartSession
            students={students.map((s) => ({ id: s.id, nickname: s.nickname, book: primaryBookForStudent(s.id) }))}
          />
        </Card>

        <Card>
          <CardHeader title="Needs attention" description="Pages marked “needs work”" />
          {attention.length === 0 ? (
            <p className="text-muted">Everyone is on track.</p>
          ) : (
            <ul className="space-y-1">
              {attention.map(({ student, needsWorkPages }) => (
                <li key={student.id}>
                  <Link
                    href={`/teacher/students/${student.id}`}
                    className="-mx-2 flex min-h-11 items-center justify-between rounded-xl px-2 hover:bg-surface-2"
                  >
                    <span className="font-medium">{student.nickname}</span>
                    <Badge tone="warning" icon="alert">
                      {needsWorkPages.length} {needsWorkPages.length === 1 ? "page" : "pages"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Classes" />
          <ul className="space-y-1">
            {classes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/teacher/classes/${c.id}`}
                  className="-mx-2 flex min-h-11 items-center justify-between gap-2 rounded-xl px-2 hover:bg-surface-2"
                >
                  <span>
                    <span className="font-medium">{c.name}</span>
                    <span className="block text-sm text-muted">
                      {c.studentCount} students{c.pendingCount ? ` · ${c.pendingCount} invited` : ""}
                    </span>
                  </span>
                  <Icon name="chevronRight" className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
