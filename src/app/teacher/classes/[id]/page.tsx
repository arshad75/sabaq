import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { InviteLink } from "@/components/teacher/forms";
import { getPreviewState } from "@/lib/preview";
import { formatDate, relativeDays } from "@/lib/format";
import { CURRENT, getClassForTeacher } from "@/lib/mock/repo";
import { MOCK_NOW } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Class" };

export default function Page(props: PageProps<"/teacher/classes/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading class" />}>
      <ClassScreen {...props} />
    </Suspense>
  );
}

async function ClassScreen({ params, searchParams }: PageProps<"/teacher/classes/[id]">) {
  const [{ id }, state] = await Promise.all([params, getPreviewState(searchParams)]);
  if (state === "loading") return <LoadingBlock label="Loading class" />;
  if (state === "error") return <ErrorState description="We couldn’t load this class." />;

  const data = getClassForTeacher(CURRENT.teacherId, id);
  if (!data) notFound();
  const members = state === "empty" ? [] : data.members;
  const approved = members.filter((m) => m.status === "approved");
  const invited = members.filter((m) => m.status === "invited");

  return (
    <>
      <PageHeader
        back={
          <Link href="/teacher" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg">
            <Icon name="chevronLeft" size={16} /> Home
          </Link>
        }
        title={data.cls.name}
        description={`${approved.length} students · ${invited.length} pending`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Students" />
            {approved.length === 0 ? (
              <EmptyState
                icon="users"
                title="No students in this class yet"
                description="Share the invite link with a guardian. Once they approve, the student appears here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {approved.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/teacher/students/${m.student!.id}`}
                      className="-mx-2 flex min-h-14 items-center justify-between gap-3 rounded-xl px-2 hover:bg-surface-2"
                    >
                      <span className="flex items-center gap-3">
                        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-primary-soft font-semibold text-primary">
                          {m.student!.nickname.slice(0, 1)}
                        </span>
                        <span>
                          <span className="block font-medium">{m.student!.nickname}</span>
                          <span className="block text-sm text-muted">
                            {m.lastSessionAt ? `Last seen ${relativeDays(m.lastSessionAt, MOCK_NOW)}` : "No sessions yet"}
                          </span>
                        </span>
                      </span>
                      <Icon name="chevronRight" className="text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Pending invites" description="Waiting for a guardian to approve." />
            {invited.length === 0 ? (
              <p className="text-muted">No pending invites.</p>
            ) : (
              <ul className="divide-y divide-border">
                {invited.map((m) => (
                  <li key={m.id} className="flex min-h-14 items-center justify-between gap-3">
                    <span>
                      <span className="block font-medium">Invited student</span>
                      <span className="block text-sm text-muted">
                        Name shown after guardian approval
                        {m.inviteExpiresAt && ` · expires ${formatDate(m.inviteExpiresAt)}`}
                      </span>
                    </span>
                    <Badge tone="warning" icon="clock">
                      Pending
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card>
          <CardHeader title="Invite link" />
          <InviteLink classId={data.cls.id} initialExpiry="when you create one" />
        </Card>
      </div>
    </>
  );
}
