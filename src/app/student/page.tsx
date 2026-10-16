import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { getPreviewState } from "@/lib/preview";
import { ASSIGNMENT_KIND_LABEL, pageRange, relativeDays } from "@/lib/format";
import { CURRENT, getStudent, listAssignmentsForStudent, liveSessionForTeacher, studentStreak } from "@/lib/mock/repo";
import { MOCK_NOW, MOCK_TODAY } from "@/lib/mock/data";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "My reading" };

export default function Page(props: PageProps<"/student">) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading" rows={2} />}>
      <Home searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: Pick<PageProps<"/student">, "searchParams">) {
  const state = await getPreviewState(searchParams);
  if (state === "loading") return <LoadingBlock label="Loading" rows={2} />;
  if (state === "error") return <ErrorState title="Oops" description="We couldn’t load your reading. Ask a grown-up to check the internet." />;

  const me = getStudent(CURRENT.studentId)!;
  const todo = state === "empty" ? [] : listAssignmentsForStudent(me.id).filter((a) => a.status !== "completed");
  const today = todo.filter((a) => a.dueOn <= MOCK_TODAY).sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const later = todo.filter((a) => a.dueOn > MOCK_TODAY);
  const streak = studentStreak(me.id);
  const live = state === "empty" ? undefined : liveSessionForTeacher("t1");
  const liveForMe = live?.studentId === me.id ? live : undefined;
  const first = today[0] ?? later[0];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">Assalamu alaikum, {me.nickname}!</h1>

      {liveForMe && (
        <Card className="border-primary/40 bg-primary-soft">
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="wifi" /> Your teacher is ready
          </p>
          <ButtonLink
            href={`/session/${liveForMe.roomCode}?role=student${first ? `&page=${first.fromPage}` : ""}`}
            size="lg"
            icon="play"
            className="mt-3 w-full sm:w-auto"
          >
            Join the lesson
          </ButtonLink>
        </Card>
      )}

      {!first ? (
        <EmptyState icon="star" title="All done!" description="You have no reading to do right now. Well done!" />
      ) : (
        <Card className="p-6">
          <p className="text-base text-muted">Today’s reading</p>
          <p className="mt-1 text-2xl font-semibold">{ASSIGNMENT_KIND_LABEL[first.kind]}</p>
          <p className="text-xl">{pageRange(first.fromPage, first.toPage)}</p>
          <ButtonLink href={`/student/assignments/${first.id}`} size="lg" icon="book" className="mt-5 w-full text-xl sm:w-auto">
            Start reading
          </ButtonLink>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-warning-soft text-warning">
            <Icon name="flame" size={30} />
          </span>
          <div>
            <p className="text-2xl font-semibold">{streak} reading days</p>
            <ul className="mt-1 flex gap-1" aria-label={`${streak} of 7 days this week`}>
              {Array.from({ length: 7 }, (_, i) => (
                <li
                  key={i}
                  aria-hidden
                  className={cn("size-5 rounded-full", i < streak ? "bg-warning" : "bg-surface-2")}
                />
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {today.length + later.length > 1 && (
        <section aria-labelledby="more">
          <h2 id="more" className="mb-3 text-xl font-semibold">
            More reading
          </h2>
          <ul className="space-y-3">
            {[...today, ...later]
              .filter((a) => a.id !== first?.id)
              .map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/student/assignments/${a.id}`}
                    className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 hover:bg-surface-2"
                  >
                    <span>
                      <span className="block font-semibold">{ASSIGNMENT_KIND_LABEL[a.kind]}</span>
                      <span className="block text-base text-muted">
                        {pageRange(a.fromPage, a.toPage)} · due {relativeDays(a.dueOn, MOCK_NOW)}
                      </span>
                    </span>
                    <Icon name="chevronRight" />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
