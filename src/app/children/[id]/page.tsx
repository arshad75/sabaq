import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AccountShell } from "@/components/shell/AccountShell";
import { ConfirmDelete, HomeworkForm } from "@/components/child/forms";
import { PageGrid } from "@/components/progress/PageGrid";
import { ProgressStats, plainSummary } from "@/components/progress/ProgressStats";
import { TrendChart } from "@/components/progress/TrendChart";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import { BadgeGrid, RewardChips } from "@/components/ui/Friendly";
import { Select, TextInput } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { LoadingBlock } from "@/components/ui/States";
import { BOOK_LABEL, bookPageCount } from "@/lib/books";
import { loadChild } from "@/lib/data/child";
import { deleteChild, setPageStatus, updateHomework } from "@/lib/data/child-actions";
import { STATUS_CONFIG } from "@/lib/marks";
import { PAGE_STATUSES } from "@/lib/domain/types";
import { badges, countStars, weeklyStreak, weeklyTrend } from "@/lib/rewards";
import { createSupabaseServer, getAccount } from "@/lib/supabase/server";
import { requestNow } from "@/lib/clock";

export const metadata: Metadata = { title: "Progress" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KIND_LABEL = { new: "New lesson", recent_revision: "Recent revision", old_revision: "Old revision" } as const;
const HW_TONE = { assigned: "warning", completed: "success", needs_more_work: "danger" } as const;
const HW_LABEL = { assigned: "To do", completed: "Done", needs_more_work: "Needs more work" } as const;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export default function Page(props: PageProps<"/children/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/children/[id]">, "params">) {
  const account = await getAccount();
  if (!account) redirect("/login");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const child = await loadChild(await createSupabaseServer(), id);
  if (!child) notFound();

  const now = requestNow();
  const isTeacher = account.role === "teacher";
  const pageCount = bookPageCount(child.book);
  const stars = countStars(child.lessons);
  const streak = weeklyStreak(child.lessons, now);
  const lastMonth = child.lessons.filter((l) => now - Date.parse(l.startedAt) < 30 * 86_400_000).length;
  const furthest = Math.max(0, ...child.progress.map((p) => p.page));

  return (
    <AccountShell account={account}>
      <Link href="/welcome" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <Icon name="chevronLeft" size={16} /> Home
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-tile-mint via-tile-sky to-tile-lilac p-6 sm:p-8">
        <p className="text-sm font-medium text-muted">
          {BOOK_LABEL[child.book]}
          {child.teacher && ` with ${child.teacher.name}`}
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">{child.nickname}</h1>
        <p className="mt-2 max-w-2xl text-muted">{plainSummary(child.nickname, child.progress, lastMonth)}</p>
        <div className="mt-4">
          <RewardChips stars={stars} streak={streak} lessons={child.lessons.length} />
        </div>
      </section>

      <div className="mt-6 grid gap-6">
        <Card>
          <CardHeader title="Badges" />
          <BadgeGrid badges={badges(child.lessons, child.progress, now)} />
        </Card>

        <Card>
          <CardHeader title={`${BOOK_LABEL[child.book]} progress`} description="Every page, coloured by how it’s going." />
          <ProgressStats progress={child.progress} pageCount={pageCount} />
          <div className="mt-5">
            <PageGrid pageCount={pageCount} progress={child.progress} label={`${child.nickname}’s page progress`} />
          </div>
          {isTeacher && (
            <form action={setPageStatus} className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl bg-surface-2 p-4">
              <input type="hidden" name="student" value={child.id} />
              <input type="hidden" name="book" value={child.book} />
              <label className="space-y-1 text-sm font-medium">
                Page
                <TextInput name="page" type="number" min={1} max={pageCount} defaultValue={furthest || 1} className="w-24" />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Status
                <Select name="status" defaultValue="solid">
                  {PAGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </Select>
              </label>
              <Button type="submit" variant="secondary">
                Set page status
              </Button>
            </form>
          )}
        </Card>

        <Card>
          <CardHeader title="Homework" description={isTeacher ? "What to practise before the next lesson." : "Set by the teacher."} />
          {child.homework.length === 0 ? (
            <p className="text-muted">No homework yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {child.homework.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                  <div>
                    <p className="font-medium">
                      {KIND_LABEL[h.kind]}: {BOOK_LABEL[h.book]} {h.fromPage === h.toPage ? `page ${h.fromPage}` : `pages ${h.fromPage}–${h.toPage}`}
                    </p>
                    <p className="text-sm text-muted">
                      Due {day(h.dueOn)}
                      {h.note && ` · ${h.note}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={HW_TONE[h.status]}>{HW_LABEL[h.status]}</Badge>
                    {isTeacher && (
                      <form action={updateHomework} className="flex gap-2">
                        <input type="hidden" name="id" value={h.id} />
                        <Select name="status" defaultValue={h.status} aria-label="Homework status" className="min-h-9 w-auto text-sm">
                          <option value="assigned">To do</option>
                          <option value="completed">Done</option>
                          <option value="needs_more_work">Needs more work</option>
                        </Select>
                        <Button type="submit" variant="ghost">
                          Save
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {isTeacher && (
            <div className="mt-5 rounded-2xl bg-surface-2 p-4">
              <h3 className="mb-3 font-semibold">Set new homework</h3>
              <HomeworkForm
                studentId={child.id}
                book={child.book}
                suggestedPage={Math.min(pageCount, (furthest || 0) + 1)}
                defaultDue={new Date(now + 7 * 86_400_000).toISOString().slice(0, 10)}
              />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Marks by week" description="More green and fewer corrections over time means it’s sticking." />
          <TrendChart buckets={weeklyTrend(child.lessons, now)} />
        </Card>

        <Card>
          <CardHeader title="Lessons" />
          {child.lessons.length === 0 ? (
            <p className="text-muted">No saved lessons yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {child.lessons.map((l) => {
                const good = l.marks.filter((m) => m.markType === "good").length;
                return (
                  <li key={l.id}>
                    <Link href={`/lessons/${l.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2 hover:text-primary">
                      <span>
                        {day(l.startedAt)} ·{" "}
                        {l.pagesCovered.length === 1 ? `page ${l.pagesCovered[0]}` : `${l.pagesCovered.length} pages`}
                      </span>
                      <span className="inline-flex items-center gap-2 text-sm text-muted">
                        {good > 0 && (
                          <span className="inline-flex items-center gap-1 text-star">
                            <Icon name="star" size={14} /> {good}
                          </span>
                        )}
                        {l.marks.length} {l.marks.length === 1 ? "mark" : "marks"} ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {account.role === "guardian" && (
          <Card>
            <CardHeader title={`Delete ${child.nickname}’s data`} description="Removes them from their teacher’s class too." />
            <ConfirmDelete
              action={deleteChild}
              hidden={{ student: child.id }}
              label={`Delete ${child.nickname}’s data`}
              explanation={`Deletes ${child.nickname} and all their lessons, marks, progress and homework. This can’t be undone.`}
            />
          </Card>
        )}
      </div>
    </AccountShell>
  );
}
