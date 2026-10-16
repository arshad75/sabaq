import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { ProgressRing } from "@/components/ui/Indicators";
import { Icon } from "@/components/ui/Icon";
import { AddChildForm, ApprovalActions, ExportButton, LinkTeacherForm } from "@/components/guardian/forms";
import { getPreviewState } from "@/lib/preview";
import { ASSIGNMENT_KIND_LABEL, pageRange, relativeDays } from "@/lib/format";
import {
  CURRENT,
  exportGuardianData,
  getProfile,
  getProgressForStudent,
  listAssignmentsForStudent,
  listChildren,
  listSessionsForStudent,
  pendingApprovalsForGuardian,
  primaryBookForStudent,
} from "@/lib/mock/repo";
import { BOOK_LABEL } from "@/lib/books";
import { MOCK_NOW } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Family" };

export default function Page(props: PageProps<"/guardian">) {
  const me = getProfile(CURRENT.guardianId)!;
  return (
    <>
      <PageHeader title={`Assalamu alaikum, ${me.displayName}`} description="Your children’s lessons at a glance." />
      <Suspense fallback={<LoadingBlock label="Loading family" />}>
        <Dashboard searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/guardian">, "searchParams">) {
  const state = await getPreviewState(searchParams);
  if (state === "loading") return <LoadingBlock label="Loading family" />;
  if (state === "error") return <ErrorState description="We couldn’t load your family dashboard." />;

  const g = CURRENT.guardianId;
  const children = state === "empty" ? [] : listChildren(g);
  const pending = state === "empty" ? [] : pendingApprovalsForGuardian(g);

  const actions = (
    <div className="flex flex-wrap items-start gap-2">
      <AddChildForm />
      <LinkTeacherForm />
      <ExportButton json={JSON.stringify(exportGuardianData(g), null, 2)} filename="lesson-sync-export.json" />
    </div>
  );

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon="users"
          title="Add your first child"
          description="Just a first name or nickname. Then link their teacher with the invite link the teacher sends you."
        />
        {actions}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actions}

      {pending.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader title="Waiting for your approval" description="Teachers can’t see your child until you approve." />
          <ul className="divide-y divide-border">
            {pending.map((p) => (
              <li key={p.membership.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {p.teacher.displayName} wants to teach {p.child.nickname}
                  </p>
                  <p className="text-sm text-muted">Class: {p.cls.name}</p>
                </div>
                <ApprovalActions teacherName={p.teacher.displayName} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {children.map((c) => {
          const last = listSessionsForStudent(c.id)[0];
          const book = primaryBookForStudent(c.id);
          const progress = [...getProgressForStudent(c.id, book).values()];
          const read = progress.filter((p) => p.status !== "not_started").length;
          const solid = progress.filter((p) => p.status === "solid").length;
          const current = listAssignmentsForStudent(c.id).find((a) => a.status === "assigned");
          return (
            <li key={c.id}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold">
                      {c.nickname}{" "}
                      <span className="align-middle text-sm font-medium text-muted">· {BOOK_LABEL[book]}</span>
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {last ? `Last lesson ${relativeDays(last.startedAt, MOCK_NOW)}` : "No lessons yet"}
                    </p>
                    {current ? (
                      <p className="mt-3">
                        <Badge tone="primary" icon="book">
                          {ASSIGNMENT_KIND_LABEL[current.kind]}
                        </Badge>{" "}
                        <span className="text-sm">{pageRange(current.fromPage, current.toPage, current.book)}</span>
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-muted">No homework right now.</p>
                    )}
                  </div>
                  <ProgressRing value={read ? solid / read : 0} label={`${c.nickname}: pages solid`} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <Link
                    href={`/guardian/children/${c.id}`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-border px-3 font-medium hover:bg-surface-2"
                  >
                    Profile <Icon name="chevronRight" size={16} />
                  </Link>
                  <Link
                    href={`/guardian/children/${c.id}/progress`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-border px-3 font-medium hover:bg-surface-2"
                  >
                    Progress <Icon name="chart" size={16} />
                  </Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
