import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardHeader, PageHeader, Stat } from "@/components/ui/Card";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";
import { MarkChip } from "@/components/ui/Indicators";
import { StaticPageView } from "@/components/reading/StaticPageView";
import { AssignForm, TeacherNoteForm } from "@/components/teacher/forms";
import { getPreviewState } from "@/lib/preview";
import { getPage, getSource, wordKey } from "@/lib/quran";
import { durationMinutes, formatDateLong, formatTime, pageRange } from "@/lib/format";
import { MARK_CONFIG } from "@/lib/marks";
import { MARK_TYPES } from "@/lib/domain/types";
import { CURRENT, countMarksByType, getSessionForGuardian, getSessionForTeacher, marksForSession } from "@/lib/mock/repo";
import { MOCK_NOW } from "@/lib/mock/data";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Session summary" };

export default function Page(props: PageProps<"/teacher/sessions/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock label="Loading session" rows={4} />}>
      <Summary {...props} />
    </Suspense>
  );
}

async function Summary({ params, searchParams }: PageProps<"/teacher/sessions/[id]">) {
  const [{ id }, state, sp] = await Promise.all([params, getPreviewState(searchParams), searchParams]);
  if (state === "loading") return <LoadingBlock label="Loading session" rows={4} />;
  if (state === "error") return <ErrorState description="We couldn’t load this session summary." />;

  // Prototype only: `?view=guardian` previews the read-only guardian view of this route.
  const asGuardian = sp.view === "guardian";
  const session = asGuardian
    ? getSessionForGuardian(CURRENT.guardianId, id)
    : getSessionForTeacher(CURRENT.teacherId, id);
  if (!session) notFound();

  const marks = state === "empty" ? [] : marksForSession(session.id);
  const counts = countMarksByType(marks);
  const pages = session.pagesCovered;
  const requested = Number(sp.page);
  const viewPage = pages.includes(requested) ? requested : pages[0];
  const pageData = viewPage ? await getPage(viewPage) : null;
  const mins = durationMinutes(session.startedAt, session.endedAt);
  const base = `/teacher/sessions/${session.id}${asGuardian ? "?view=guardian&" : "?"}`;

  return (
    <>
      <PageHeader
        back={
          <Link
            href={asGuardian ? `/guardian/children/${session.studentId}` : `/teacher/students/${session.studentId}`}
            className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg"
          >
            <Icon name="chevronLeft" size={16} /> {session.student.nickname}
          </Link>
        }
        title={`Session with ${session.student.nickname}`}
        description={`${formatDateLong(session.startedAt)} · ${formatTime(session.startedAt)} UTC · ${session.teacher.displayName}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Duration" value={mins !== null ? `${mins} min` : "Live"} />
        <Stat label="Pages" value={pages.length ? pageRange(Math.min(...pages), Math.max(...pages)).replace("Pages ", "") : "—"} />
        <Stat label="Marks" value={marks.filter((m) => m.markType !== "good").length} hint="to work on" />
        <Stat label="Good" value={counts.good} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Marks by type" />
            {marks.length === 0 ? (
              <p className="text-muted">No marks in this session.</p>
            ) : (
              <div className="space-y-4">
                {MARK_TYPES.filter((t) => counts[t] > 0).map((t) => (
                  <section key={t} aria-label={MARK_CONFIG[t].label}>
                    <div className="mb-2 flex items-center gap-2">
                      <MarkChip type={t} count={counts[t]} />
                      <span className="text-sm text-muted">{MARK_CONFIG[t].description}</span>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {marks
                        .filter((m) => m.markType === t)
                        .map((m) => (
                          <li key={m.id}>
                            <Link
                              href={`${base}page=${m.page}`}
                              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-border px-3 text-sm hover:bg-surface-2"
                            >
                              p.{m.page} · {m.ayah}:{m.wordIndex}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>

          {pageData && (
            <Card>
              <CardHeader
                title={`Page ${viewPage}`}
                action={
                  <nav aria-label="Pages in this session" className="flex flex-wrap gap-1">
                    {pages.map((p) => (
                      <Link
                        key={p}
                        href={`${base}page=${p}`}
                        aria-current={p === viewPage ? "page" : undefined}
                        className={cn(
                          "inline-grid min-h-11 min-w-11 place-items-center rounded-xl border px-2 text-sm font-medium",
                          p === viewPage ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2",
                        )}
                      >
                        {p}
                      </Link>
                    ))}
                  </nav>
                }
              />
              <StaticPageView
                page={pageData}
                isPlaceholder={getSource().info.isPlaceholder}
                marks={marks.filter((m) => m.page === viewPage).map((m) => ({ key: wordKey(m), markType: m.markType }))}
              />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Teacher note" description={asGuardian ? undefined : "Visible to the guardian"} />
            {asGuardian ? (
              <p>{session.teacherNote || <span className="text-muted">No note for this session.</span>}</p>
            ) : (
              <TeacherNoteForm initial={session.teacherNote} label="Note for this session" />
            )}
          </Card>
          {!asGuardian && (
            <Card>
              <CardHeader title="Assign follow-up" />
              <AssignForm
                defaultFrom={pages[0] ?? 1}
                defaultTo={pages[pages.length - 1] ?? 1}
                defaultDue={new Date(new Date(MOCK_NOW).getTime() + 2 * 86_400_000).toISOString().slice(0, 10)}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
