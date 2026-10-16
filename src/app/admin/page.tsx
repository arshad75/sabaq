import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/shell/AccountShell";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import { Select, TextInput } from "@/components/ui/Form";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { adminSetRole, adminUpdateRequest } from "@/lib/auth/account-actions";
import { BOOK_LABEL } from "@/lib/books";
import type { Book } from "@/lib/domain/types";
import { createSupabaseServer, getAccount } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

type Request = {
  id: string;
  created_at: string;
  guardian_name: string;
  guardian_email: string;
  child_nickname: string;
  book: Book;
  preferred_times: string;
  timezone: string;
  note: string | null;
  status: "requested" | "scheduled" | "done" | "cancelled";
  schedule_note: string | null;
  teacher_id: string | null;
};

type Person = {
  id: string;
  display_name: string;
  email: string;
  role: "guardian" | "teacher";
  is_admin: boolean;
  created_at: string;
};

const STATUS_TONE = { requested: "warning", scheduled: "primary", done: "success", cancelled: "neutral" } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

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
  if (!account.isAdmin) redirect("/welcome");

  const supabase = await createSupabaseServer();
  const [requestsRes, peopleRes] = await Promise.all([
    supabase.rpc("admin_list_requests"),
    supabase.rpc("admin_list_people"),
  ]);
  const requests = (requestsRes.data ?? []) as Request[];
  const people = (peopleRes.data ?? []) as Person[];
  const teachers = people.filter((p) => p.role === "teacher");

  return (
    <AccountShell account={account}>
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-muted">Arrange first lessons and manage who teaches.</p>

      <section aria-labelledby="requests" className="mt-8">
        <h2 id="requests" className="mb-3 text-xl font-semibold">
          Lesson requests
        </h2>
        {!requests.length ? (
          <EmptyState icon="calendar" title="No requests yet" description="They’ll appear here when families ask." />
        ) : (
          <div className="grid gap-4">
            {requests.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">
                      {r.child_nickname} · {BOOK_LABEL[r.book]}
                    </p>
                    <p className="text-sm text-muted">
                      {r.guardian_name} ·{" "}
                      <a href={`mailto:${r.guardian_email}`} className="text-primary underline-offset-4 hover:underline">
                        {r.guardian_email}
                      </a>{" "}
                      · asked {date(r.created_at)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </div>
                <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <dt className="text-muted">Times</dt>
                  <dd>
                    {r.preferred_times} <span className="text-muted">({r.timezone})</span>
                  </dd>
                  {r.note && (
                    <>
                      <dt className="text-muted">Note</dt>
                      <dd>{r.note}</dd>
                    </>
                  )}
                </dl>
                <form action={adminUpdateRequest} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="space-y-1 text-sm font-medium">
                    Status
                    <Select name="status" defaultValue={r.status}>
                      <option value="requested">Requested</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    When (shown to the family)
                    <TextInput name="schedule" defaultValue={r.schedule_note ?? ""} placeholder="Sat 19 Oct, 5pm Sydney" maxLength={200} />
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    Teacher
                    <Select name="teacher" defaultValue={r.teacher_id ?? ""}>
                      <option value="">Not assigned</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.display_name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <Button type="submit">Save</Button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="people" className="mt-10">
        <h2 id="people" className="mb-3 text-xl font-semibold">
          People
        </h2>
        <Card>
          <CardHeader
            title={`${people.length} accounts`}
            description="Make someone a teacher once you’ve checked who they are."
          />
          <ul className="divide-y divide-border">
            {people.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {p.display_name} {p.is_admin && <Badge tone="primary">admin</Badge>}
                  </p>
                  <p className="text-sm text-muted">
                    {p.email} · joined {date(p.created_at)}
                  </p>
                </div>
                <form action={adminSetRole} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="role" value={p.role === "teacher" ? "guardian" : "teacher"} />
                  <Badge tone={p.role === "teacher" ? "success" : "neutral"}>
                    {p.role === "teacher" ? "Teacher" : "Parent"}
                  </Badge>
                  <Button type="submit" variant="secondary">
                    {p.role === "teacher" ? "Make parent" : "Make teacher"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </AccountShell>
  );
}
