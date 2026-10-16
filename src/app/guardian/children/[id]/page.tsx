import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { SessionList } from "@/components/lists";
import {
  ApprovalActions,
  DeleteChildData,
  LoginSetup,
  RecordingConsent,
  RevokeButton,
} from "@/components/guardian/forms";
import { getPreviewState } from "@/lib/preview";
import { formatDate } from "@/lib/format";
import { CURRENT, getChild, linkedTeachersForChild, listSessionsForStudent, marksForSession } from "@/lib/mock/repo";

export const metadata: Metadata = { title: "Child profile" };

export default function Page(props: PageProps<"/guardian/children/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading profile" rows={4} />}>
      <ChildScreen {...props} />
    </Suspense>
  );
}

async function ChildScreen({ params, searchParams }: PageProps<"/guardian/children/[id]">) {
  const [{ id }, state] = await Promise.all([params, getPreviewState(searchParams)]);
  if (state === "loading") return <LoadingBlock label="Loading profile" rows={4} />;
  if (state === "error") return <ErrorState description="We couldn’t load this profile." />;

  const child = getChild(CURRENT.guardianId, id);
  if (!child) notFound();
  const links = state === "empty" ? [] : linkedTeachersForChild(CURRENT.guardianId, child.id);
  const sessions = state === "empty" ? [] : listSessionsForStudent(child.id).slice(0, 5);

  return (
    <>
      <PageHeader
        back={
          <Link href="/guardian" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg">
            <Icon name="chevronLeft" size={16} /> Family
          </Link>
        }
        title={child.nickname}
        actions={
          <ButtonLink href={`/guardian/children/${child.id}/progress`} variant="secondary" icon="chart">
            Progress
          </ButtonLink>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile" description="We only keep a nickname. No birthday, photo, or free-text details." />
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
              <dt className="text-muted">Nickname</dt>
              <dd className="font-medium">{child.nickname}</dd>
              <dt className="text-muted">Signs in with</dt>
              <dd className="font-medium">{child.loginMethod === "pin" ? "PIN" : "Magic link"}</dd>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Tablet sign-in" />
            <LoginSetup method={child.loginMethod} nickname={child.nickname} />
          </Card>

          <Card>
            <CardHeader title="Recordings" />
            <RecordingConsent initial={child.recordingConsent} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Teachers" description="Only approved teachers can see lessons and progress." />
            {links.length === 0 ? (
              <p className="text-muted">No teachers linked yet. Ask the teacher for an invite link.</p>
            ) : (
              <ul className="divide-y divide-border">
                {links.map((l) => (
                  <li key={l.membership.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{l.teacher.displayName}</p>
                      <p className="text-sm text-muted">
                        {l.cls.name}
                        {l.membership.approvedByGuardianAt && ` · approved ${formatDate(l.membership.approvedByGuardianAt)}`}
                      </p>
                    </div>
                    {l.membership.status === "approved" ? (
                      <div className="flex items-center gap-2">
                        <Badge tone="success" icon="check">
                          Approved
                        </Badge>
                        <RevokeButton teacherName={l.teacher.displayName} />
                      </div>
                    ) : (
                      <ApprovalActions teacherName={l.teacher.displayName} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent lessons" />
            {sessions.length === 0 ? (
              <p className="text-muted">No lessons yet.</p>
            ) : (
              <SessionList
                sessions={sessions}
                marksFor={marksForSession}
                hrefFor={(s) => `/teacher/sessions/${s.id}?view=guardian`}
              />
            )}
          </Card>

          <Card className="border-danger/40">
            <CardHeader title="Delete data" />
            <DeleteChildData nickname={child.nickname} />
          </Card>
        </div>
      </div>
    </>
  );
}
