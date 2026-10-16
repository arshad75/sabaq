import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AccountShell } from "@/components/shell/AccountShell";
import { ImagePageView } from "@/components/reading/ImagePageView";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { MarkChip } from "@/components/ui/Indicators";
import { LoadingBlock } from "@/components/ui/States";
import { BOOK_LABEL } from "@/lib/books";
import { MARK_TYPES, type Book, type MarkType } from "@/lib/domain/types";
import { nearestCell } from "@/lib/qaida/layout";
import { createSupabaseServer, getAccount } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lesson summary" };

type Lesson = {
  id: string;
  book: Book;
  started_at: string;
  ended_at: string | null;
  teacher_note: string;
  pages_covered: number[];
  teacher_id: string | null;
  students: { nickname: string } | null;
};

type MarkRow = {
  id: string;
  mark_type: MarkType;
  page: number;
  surah: number | null;
  ayah: number | null;
  word_index: number | null;
  x: number | null;
  y: number | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function where(m: MarkRow): string {
  if (m.surah && m.ayah && m.word_index) return `Surah ${m.surah}, ayah ${m.ayah}, word ${m.word_index}`;
  const cell = m.x !== null && m.y !== null ? nearestCell(m.page, { x: m.x, y: m.y }) : undefined;
  return cell ? `Line ${cell.line}, box ${cell.word}` : "On the page";
}

// Reading order: Quran by position in the text; Qaida top to bottom, right to left.
const order = (a: MarkRow, b: MarkRow) =>
  a.page - b.page ||
  (a.surah ?? 0) - (b.surah ?? 0) ||
  (a.ayah ?? 0) - (b.ayah ?? 0) ||
  (a.word_index ?? 0) - (b.word_index ?? 0) ||
  (a.y ?? 0) - (b.y ?? 0) ||
  (b.x ?? 0) - (a.x ?? 0);

export default function Page(props: PageProps<"/lessons/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/lessons/[id]">, "params">) {
  const account = await getAccount();
  if (!account) redirect("/login");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createSupabaseServer();
  const [{ data: lesson }, { data: markRows }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, book, started_at, ended_at, teacher_note, pages_covered, teacher_id, students(nickname)")
      .eq("id", id)
      .maybeSingle<Lesson>(),
    supabase
      .from("marks")
      .select("id, mark_type, page, surah, ayah, word_index, x, y")
      .eq("session_id", id)
      .returns<MarkRow[]>(),
  ]);
  // RLS returns nothing for lessons this person may not see.
  if (!lesson) notFound();

  const { data: teacher } = lesson.teacher_id
    ? await supabase.from("profiles").select("display_name").eq("id", lesson.teacher_id).maybeSingle()
    : { data: null };
  const marks = [...(markRows ?? [])].sort(order).map((m, i) => ({ ...m, n: i + 1 }));
  const counts = MARK_TYPES.map((t) => [t, marks.filter((m) => m.mark_type === t).length] as const).filter(([, c]) => c);
  const pages = [...new Set([...lesson.pages_covered, ...marks.map((m) => m.page)])].sort((a, b) => a - b);
  const minutes = lesson.ended_at
    ? Math.max(1, Math.round((Date.parse(lesson.ended_at) - Date.parse(lesson.started_at)) / 60_000))
    : null;
  const when = new Date(lesson.started_at).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <AccountShell account={account}>
      <Link href="/welcome" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <Icon name="chevronLeft" size={16} /> Home
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {lesson.students?.nickname ?? "Lesson"} · {BOOK_LABEL[lesson.book]}
      </h1>
      <p className="mt-1 text-muted">
        {when}
        {minutes && ` · ${minutes} min`}
        {teacher?.display_name && ` · with ${teacher.display_name}`}
      </p>

      <div className="mt-6 grid gap-6">
        <Card>
          <CardHeader title="At a glance" />
          <p>
            {pages.length === 0 ? "No pages recorded." : `${pages.length === 1 ? "Page" : "Pages"} ${pages.join(", ")}`}
            {" · "}
            {marks.length} {marks.length === 1 ? "mark" : "marks"}
          </p>
          {counts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {counts.map(([t, c]) => (
                <MarkChip key={t} type={t} count={c} />
              ))}
            </div>
          )}
          {lesson.teacher_note && (
            <blockquote className="mt-4 rounded-xl bg-surface-2 p-4">
              <p className="text-sm font-medium text-muted">Teacher’s note</p>
              <p className="mt-1">{lesson.teacher_note}</p>
            </blockquote>
          )}
        </Card>

        {pages.map((page) => {
          const onPage = marks.filter((m) => m.page === page);
          if (onPage.length === 0) return null;
          return (
            <Card key={page}>
              <CardHeader title={`Page ${page}`} />
              <div className={lesson.book === "qaida" ? "grid gap-6 md:grid-cols-[1fr_1fr]" : ""}>
                {lesson.book === "qaida" && (
                  <ImagePageView
                    page={page}
                    pins={onPage
                      .filter((m) => m.x !== null && m.y !== null)
                      .map((m) => ({ id: m.id, point: { x: m.x!, y: m.y! }, markType: m.mark_type, label: String(m.n) }))}
                  />
                )}
                <ol className="space-y-2">
                  {onPage.map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fg text-xs font-semibold text-bg">
                        {m.n}
                      </span>
                      <MarkChip type={m.mark_type} />
                      <span className="text-sm text-muted">{where(m)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          );
        })}
      </div>
    </AccountShell>
  );
}
