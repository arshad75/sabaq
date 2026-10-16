import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/shell/AccountShell";
import { LessonRequestForm, StartLiveLesson } from "@/components/auth/AccountForms";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import { Tile, TileGrid } from "@/components/ui/Friendly";
import { LoadingBlock } from "@/components/ui/States";
import { BOOK_LABEL } from "@/lib/books";
import type { Book } from "@/lib/domain/types";
import { createSupabaseServer, getAccount } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Home" };

type Request = {
  id: string;
  child_nickname: string;
  book: Book;
  preferred_times: string;
  status: "requested" | "scheduled" | "done" | "cancelled";
  schedule_note: string | null;
  teacher_id: string | null;
  created_at: string;
};

const STATUS = {
  requested: { label: "Requested", tone: "warning" },
  scheduled: { label: "Scheduled", tone: "primary" },
  done: { label: "Done", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

type Lesson = {
  id: string;
  student_id: string;
  book: Book;
  started_at: string;
  pages_covered: number[];
  marks: { count: number }[];
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const pagesLabel = (pages: number[]) =>
  pages.length === 0 ? "no pages" : pages.length === 1 ? `page ${pages[0]}` : `pages ${pages[0]}–${pages.at(-1)}`;

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const account = await getAccount();
  if (!account) redirect("/login");

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("lesson_requests")
    .select("id, child_nickname, book, preferred_times, status, schedule_note, teacher_id, created_at")
    .order("created_at", { ascending: false })
    .returns<Request[]>();
  const requests = data ?? [];
  const teacherIds = [...new Set(requests.map((r) => r.teacher_id).filter((id): id is string => !!id))];
  const { data: teachers } = teacherIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", teacherIds)
    : { data: [] };
  const teacherName = new Map((teachers ?? []).map((t) => [t.id as string, t.display_name as string]));
  const open = requests.some((r) => r.status === "requested" || r.status === "scheduled");

  // RLS scopes all three: a parent sees their children; a teacher sees their approved students.
  const [{ data: kids }, { data: links }, { data: lessons }] = await Promise.all([
    supabase.from("students").select("id, nickname").order("created_at").returns<{ id: string; nickname: string }[]>(),
    supabase
      .from("class_members")
      .select("student_id, status, classes(book, teacher_id)")
      .eq("status", "approved")
      .returns<{ student_id: string; classes: { book: Book; teacher_id: string } | null }[]>(),
    supabase
      .from("sessions")
      .select("id, student_id, book, started_at, pages_covered, marks(count)")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(20)
      .returns<Lesson[]>(),
  ]);
  const linkOf = new Map((links ?? []).map((l) => [l.student_id, l.classes]));
  const missing = [...new Set((links ?? []).map((l) => l.classes?.teacher_id).filter((id): id is string => !!id))].filter(
    (id) => !teacherName.has(id),
  );
  if (missing.length) {
    const { data: more } = await supabase.from("profiles").select("id, display_name").in("id", missing);
    for (const t of more ?? []) teacherName.set(t.id as string, t.display_name as string);
  }
  const children = (kids ?? []).map((k) => ({
    ...k,
    book: linkOf.get(k.id)?.book ?? ("qaida" as Book),
    teacher: teacherName.get(linkOf.get(k.id)?.teacher_id ?? "") ?? null,
    lessons: (lessons ?? []).filter((l) => l.student_id === k.id),
  }));

  return (
    <AccountShell account={account}>
      <section className="rounded-3xl bg-gradient-to-br from-tile-mint via-tile-sky to-tile-lilac p-6 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Assalamu alaikum, {account.displayName}</h1>
        <p className="mt-2 text-muted">
          {account.role === "teacher"
            ? `${children.length} ${children.length === 1 ? "student" : "students"}. Start a lesson whenever you’re ready.`
            : children.length
              ? "Here’s how your family’s lessons are going."
              : "Welcome to Sabaq. Let’s find your child a teacher."}
        </p>
      </section>

      <div className="mt-6">
        <TileGrid>
          <Tile href="/join" icon="play" color="mint" title="Join a lesson" subtitle="Enter the teacher’s code" />
          {account.role === "teacher" ? (
            <Tile href="#quick" icon="target" color="peach" title="Quick lesson" subtitle="For a trial" />
          ) : (
            <Tile
              href={children[0] ? `/children/${children[0].id}` : "#ask"}
              icon="star"
              color="sun"
              title={children[0] ? "Stars & badges" : "Find a teacher"}
              subtitle={children[0] ? children[0].nickname : "Ask for a lesson"}
            />
          )}
          <Tile href="/account/export" download icon="download" color="lilac" title="My data" subtitle="Download a copy" />
          <Tile href="/settings" icon="settings" color="sky" title="Display" subtitle="Theme and text size" />
        </TileGrid>
      </div>

      <div className="mt-8 grid gap-6">
        {account.role === "teacher" && (
          <Card>
            <CardHeader
              title="Your students"
              description="Start a lesson, read the code out on your WhatsApp or Meet call, and save it at the end."
            />
            {children.length === 0 ? (
              <p className="text-muted">No students yet. They’ll appear here once a family is linked to you.</p>
            ) : (
              <ul className="divide-y divide-border">
                {children.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <Link href={`/children/${c.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                        {c.nickname}
                      </Link>
                      <p className="text-sm text-muted">
                        {BOOK_LABEL[c.book]} · {c.lessons.length} {c.lessons.length === 1 ? "lesson" : "lessons"}
                        {c.lessons[0] && (
                          <>
                            {" · "}
                            <Link href={`/lessons/${c.lessons[0].id}`} className="text-primary underline-offset-4 hover:underline">
                              last on {shortDate(c.lessons[0].started_at)}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <StartLiveLesson student={{ id: c.id, nickname: c.nickname, book: c.book }} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {account.role === "teacher" && (
          <Card id="quick" className="scroll-mt-24">
            <CardHeader title="Quick lesson" description="For a trial with someone who isn’t linked yet. It won’t be saved." />
            <StartLiveLesson />
          </Card>
        )}

        {account.role === "guardian" &&
          children.map((c) => (
            <Card key={c.id}>
              <CardHeader
                title={c.nickname}
                description={c.teacher ? `${BOOK_LABEL[c.book]} with ${c.teacher}` : "Not linked to a teacher yet"}
                action={
                  <ButtonLink href={`/children/${c.id}`} variant="secondary" icon="chart">
                    Progress & badges
                  </ButtonLink>
                }
              />
              {c.lessons.length === 0 ? (
                <p className="text-muted">No lessons saved yet. They’ll appear here after each lesson.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {c.lessons.slice(0, 5).map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/lessons/${l.id}`}
                        className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-primary"
                      >
                        <span>
                          {shortDate(l.started_at)} · {pagesLabel(l.pages_covered)}
                        </span>
                        <span className="text-sm text-muted">
                          {l.marks[0]?.count ?? 0} {l.marks[0]?.count === 1 ? "mark" : "marks"} ›
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}

        {requests.length > 0 && (
          <Card>
            <CardHeader title="Your lesson requests" />
            <ul className="divide-y divide-border">
              {requests.map((r) => (
                <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {r.child_nickname} · {BOOK_LABEL[r.book]}
                    </p>
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  </div>
                  {r.status === "requested" && (
                    <p className="mt-1 text-sm text-muted">
                      Thanks! We’ll be in touch by email to arrange a time. You asked for: {r.preferred_times}.
                    </p>
                  )}
                  {r.status === "scheduled" && (
                    <p className="mt-1 text-sm">
                      {r.schedule_note ?? "Time to be confirmed"}
                      {r.teacher_id && teacherName.get(r.teacher_id) && ` with ${teacherName.get(r.teacher_id)}`}.
                      <span className="block text-muted">The teacher will give you a code to join on the day.</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {account.role === "guardian" && !open && (
          <Card id="ask" className="scroll-mt-24">
            <CardHeader
              title="Ask for a first lesson"
              description="Tell us a little about your child, and we’ll arrange a lesson with a teacher."
            />
            <LessonRequestForm />
          </Card>
        )}

        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Joining a lesson?</h2>
            <p className="text-sm text-muted">Open Sabaq on the child’s tablet and enter the code from the teacher.</p>
          </div>
          <ButtonLink href="/join" variant="secondary" icon="play">
            Enter a code
          </ButtonLink>
        </Card>
      </div>
    </AccountShell>
  );
}
