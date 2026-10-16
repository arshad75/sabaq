import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { PracticeReader } from "@/components/reading/PracticeReader";
import { getActingStudent, getPreviewState } from "@/lib/preview";
import { ASSIGNMENT_KIND_LABEL, ASSIGNMENT_STATUS, formatDate, pageRange, relativeDays } from "@/lib/format";
import { CURRENT, getAssignmentForStudent, liveSessionForTeacher } from "@/lib/mock/repo";
import { MOCK_NOW } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Reading" };

export default function Page(props: PageProps<"/student/assignments/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading" rows={2} />}>
      <AssignmentScreen {...props} />
    </Suspense>
  );
}

async function AssignmentScreen({ params, searchParams }: PageProps<"/student/assignments/[id]">) {
  const [{ id }, state, acting] = await Promise.all([
    params,
    getPreviewState(searchParams),
    getActingStudent(searchParams, CURRENT.studentId),
  ]);
  if (state === "loading") return <LoadingBlock label="Loading" rows={2} />;
  if (state === "error") return <ErrorState title="Oops" description="We couldn’t open this reading. Try again soon." />;

  const a = getAssignmentForStudent(acting.id, id);
  if (!a) notFound();
  const st = ASSIGNMENT_STATUS[a.status];
  const live = liveSessionForTeacher(a.teacherId);
  const liveForMe = live?.studentId === a.studentId && live.book === a.book ? live : undefined;

  return (
    <div className="space-y-6">
      <Link href={`/student${acting.qs}`} className="inline-flex min-h-11 items-center gap-1 text-base text-muted hover:text-fg">
        <Icon name="chevronLeft" /> Home
      </Link>
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{ASSIGNMENT_KIND_LABEL[a.kind]}</h1>
            <p className="mt-1 text-2xl">{pageRange(a.fromPage, a.toPage, a.book)}</p>
          </div>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <p className="mt-3 flex items-center gap-2 text-muted">
          <Icon name="calendar" /> Due {formatDate(a.dueOn)} ({relativeDays(a.dueOn, MOCK_NOW)})
        </p>
        {a.teacherFeedback && (
          <p className="mt-4 rounded-xl bg-surface-2 p-4">
            <span className="block text-sm text-muted">Your teacher says</span>“{a.teacherFeedback}”
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {liveForMe && (
            <ButtonLink
              href={`/session/${liveForMe.roomCode}?role=student&book=${a.book}&page=${a.fromPage}`}
              size="lg"
              icon="play"
              className="w-full sm:w-auto"
            >
              Read with my teacher
            </ButtonLink>
          )}
        </div>
      </Card>
      <PracticeReader book={a.book} from={a.fromPage} to={a.toPage} />
    </div>
  );
}
