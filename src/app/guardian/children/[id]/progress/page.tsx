import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { PageGrid } from "@/components/progress/PageGrid";
import { ProgressStats, plainSummary } from "@/components/progress/ProgressStats";
import { TrendChart } from "@/components/progress/TrendChart";
import { getPreviewState } from "@/lib/preview";
import { BOOK_LABEL, bookPageCount } from "@/lib/books";
import {
  CURRENT,
  getChild,
  getProgressForStudent,
  listSessionsForStudent,
  primaryBookForStudent,
  weeklyTrend,
} from "@/lib/mock/repo";
import { MOCK_NOW } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Progress" };

export default function Page(props: PageProps<"/guardian/children/[id]/progress">) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading progress" rows={3} />}>
      <ProgressScreen {...props} />
    </Suspense>
  );
}

async function ProgressScreen({ params, searchParams }: PageProps<"/guardian/children/[id]/progress">) {
  const [{ id }, state] = await Promise.all([params, getPreviewState(searchParams)]);
  if (state === "loading") return <LoadingBlock label="Loading progress" rows={3} />;
  if (state === "error") return <ErrorState description="We couldn’t load progress right now." />;

  const child = getChild(CURRENT.guardianId, id);
  if (!child) notFound();
  const book = primaryBookForStudent(child.id);
  const pageCount = bookPageCount(book);
  const progress = state === "empty" ? [] : [...getProgressForStudent(child.id, book).values()];
  const monthAgo = new Date(new Date(MOCK_NOW).getTime() - 30 * 86_400_000).toISOString();
  const recent = listSessionsForStudent(child.id, book).filter((s) => s.startedAt >= monthAgo).length;

  return (
    <>
      <PageHeader
        back={
          <Link
            href={`/guardian/children/${child.id}`}
            className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg"
          >
            <Icon name="chevronLeft" size={16} /> {child.nickname}
          </Link>
        }
        title={`${child.nickname}’s progress`}
        description={`${BOOK_LABEL[book]} · the same view the teacher sees, read-only.`}
      />
      {progress.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No progress yet"
          description={`Progress appears automatically after ${child.nickname}’s first lesson.`}
        />
      ) : (
        <div className="space-y-6">
          <Card className="bg-primary-soft">
            <h2 className="sr-only">Summary</h2>
            <p className="text-lg">{plainSummary(child.nickname, progress, recent)}</p>
          </Card>
          <ProgressStats progress={progress} pageCount={pageCount} />
          <Card>
            <CardHeader title={`${BOOK_LABEL[book]} pages`} description="Each square is one page." />
            <PageGrid pageCount={pageCount} progress={progress} label={`${child.nickname}’s page progress`} />
          </Card>
          <Card>
            <CardHeader title="Trend" description="Average marks per lesson, last 6 weeks" />
            <TrendChart buckets={weeklyTrend(child.id, book)} />
          </Card>
        </div>
      )}
    </>
  );
}
