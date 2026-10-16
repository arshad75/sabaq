import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/shell/AccountShell";
import { LessonRequestForm, StartLiveLesson } from "@/components/auth/AccountForms";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
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

  return (
    <AccountShell account={account}>
      <h1 className="text-3xl font-semibold tracking-tight">Assalamu alaikum, {account.displayName}</h1>
      <p className="mt-1 text-muted">
        {account.role === "teacher" ? "Start a lesson whenever you’re ready." : "Welcome to Sabaq."}
      </p>

      <div className="mt-8 grid gap-6">
        {account.role === "teacher" && (
          <Card>
            <CardHeader
              title="Live lesson"
              description="Start a lesson, then read the code out on your WhatsApp or Meet call."
            />
            <StartLiveLesson />
          </Card>
        )}

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
          <Card>
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
