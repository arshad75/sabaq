import type { Metadata } from "next";
import { PublicShell } from "@/components/shell/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Privacy" };

const STORED = [
  {
    who: "Parent or guardian",
    what: ["Email address and first name", "Language and display settings", "Approval history (which teachers you approved and when)"],
  },
  {
    who: "Child",
    what: [
      "First name or nickname only",
      "How they sign in (a hashed PIN, never the PIN itself)",
      "Lesson records: date, pages read, marks the teacher made on words, teacher notes",
      "Page progress and homework",
      "Recordings only if you turn them on (off by default, deleted after 30 days)",
    ],
  },
  {
    who: "Teacher",
    what: ["Email address and display name", "Class names", "Private notes about their own students"],
  },
];

const NOT_STORED = [
  "Birthdays, surnames, photos, or addresses",
  "Video or audio of calls (use WhatsApp or Meet for calls)",
  "Advertising or tracking scripts",
  "Location",
];

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy, in plain language</h1>
          <p className="mt-2 text-lg text-muted">
            This app is used by children, so we keep as little as we can and you stay in control.
          </p>
        </header>

        <Card>
          <CardHeader title="What we store" />
          <div className="space-y-5">
            {STORED.map((s) => (
              <section key={s.who}>
                <h3 className="font-semibold">{s.who}</h3>
                <ul className="mt-1 space-y-1">
                  {s.what.map((w) => (
                    <li key={w} className="flex gap-2">
                      <Icon name="check" className="mt-0.5 shrink-0 text-success" />
                      {w}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="What we never store" />
          <ul className="space-y-1">
            {NOT_STORED.map((w) => (
              <li key={w} className="flex gap-2">
                <Icon name="x" className="mt-0.5 shrink-0 text-danger" />
                {w}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Who can see what" />
          <ul className="space-y-2">
            <li>
              <strong>Parents</strong> see everything about their own children.
            </li>
            <li>
              <strong>Teachers</strong> see a child only after a parent approves them, and lose access the moment the
              parent removes them. This is enforced inside the database, not just on screen.
            </li>
            <li>
              <strong>Children</strong> see their own reading and homework. They never see other children.
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Export and delete" />
          <p>
            From your family page you can download everything we hold as a file, or delete a child’s data permanently.
            Deleting removes lessons, marks, progress, homework and recordings, and teachers lose access straight away.
          </p>
        </Card>

        <Card>
          <CardHeader title="Live lessons" />
          <p>
            During a lesson only small messages travel between devices: the page number, which word the child is on,
            and the teacher’s marks. No audio or video goes through this app.
          </p>
        </Card>

        <Card>
          <CardHeader title="Letter lessons" />
          <p>
            The self-paced letter lessons need no account. Each learner’s nickname, colour, XP, streak and letter
            progress are saved in the browser on that device only and are never sent to us. Remove a learner from
            their “Me” page, or clear the site’s data in the browser, to delete it.
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
