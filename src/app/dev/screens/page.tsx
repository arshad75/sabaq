import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SimpleShell } from "@/components/shell/AppShell";
import { Card, PageHeader } from "@/components/ui/Card";
import { previewEnabled } from "@/lib/preview";

export const metadata: Metadata = { title: "Screen index", robots: { index: false } };

const SCREENS: { group: string; items: { label: string; href: string; states?: string[] }[] }[] = [
  {
    group: "Public",
    items: [
      { label: "Landing", href: "/" },
      { label: "Log in", href: "/login", states: ["loading", "error"] },
      { label: "Student tablet sign-in", href: "/login/student" },
      { label: "Sign up", href: "/signup", states: ["loading", "error"] },
      { label: "Join", href: "/join", states: ["loading", "error"] },
      { label: "Privacy", href: "/privacy" },
    ],
  },
  {
    group: "Live session (open teacher + student in two tabs)",
    items: [
      { label: "Choose role", href: "/session/K7M2QX" },
      { label: "Student", href: "/session/K7M2QX?role=student" },
      { label: "Teacher", href: "/session/K7M2QX?role=teacher" },
      { label: "Teacher, 300 ms latency", href: "/session/K7M2QX?role=teacher&latency=300" },
      { label: "Qaida: teacher", href: "/session/QDAB23?role=teacher&book=qaida" },
      { label: "Qaida: student", href: "/session/QDAB23?role=student&book=qaida" },
      {
        label: "Student states",
        href: "/session/K7M2QX?role=student",
        states: ["loading", "waiting", "reconnecting", "ended", "invalid", "expired"],
      },
    ],
  },
  {
    group: "Teacher",
    items: [
      { label: "Dashboard", href: "/teacher", states: ["loading", "empty", "error"] },
      { label: "Class", href: "/teacher/classes/c1", states: ["loading", "empty", "error"] },
      { label: "Student progress", href: "/teacher/students/s1", states: ["loading", "empty", "error"] },
      { label: "Other teacher’s student (404)", href: "/teacher/students/s4" },
      { label: "Session summary", href: "/teacher/sessions/s1-sess-12", states: ["loading", "empty", "error"] },
      { label: "Qaida class", href: "/teacher/classes/c2" },
      { label: "Qaida student progress", href: "/teacher/students/s6" },
      { label: "Qaida session summary", href: "/teacher/sessions/s6-sess-7" },
    ],
  },
  {
    group: "Guardian",
    items: [
      { label: "Dashboard", href: "/guardian", states: ["loading", "empty", "error"] },
      { label: "Child profile", href: "/guardian/children/s1", states: ["loading", "empty", "error"] },
      { label: "Child progress", href: "/guardian/children/s1/progress", states: ["loading", "empty", "error"] },
      { label: "Qaida child progress", href: "/guardian/children/s6/progress" },
      { label: "Session summary (guardian view)", href: "/teacher/sessions/s1-sess-12?view=guardian" },
    ],
  },
  {
    group: "Student",
    items: [
      { label: "Home (not signed in)", href: "/student" },
      { label: "Home", href: "/student?as=s1", states: ["loading", "empty", "error"] },
      { label: "Assignment", href: "/student/assignments/a1?as=s1", states: ["loading", "error"] },
      { label: "Qaida learner home", href: "/student?as=s6" },
      { label: "Qaida assignment", href: "/student/assignments/a9?as=s6" },
    ],
  },
  { group: "Shared", items: [{ label: "Settings", href: "/settings" }] },
];

const withState = (href: string, state: string) => `${href}${href.includes("?") ? "&" : "?"}state=${state}`;

export default function Page() {
  if (!previewEnabled) notFound();
  return (
    <SimpleShell>
      <PageHeader title="Screen index" description="Every prototype screen and its forced states. Dev only." />
      <div className="space-y-4">
        {SCREENS.map((g) => (
          <Card key={g.group}>
            <h2 className="mb-2 font-semibold">{g.group}</h2>
            <ul className="divide-y divide-border">
              {g.items.map((s) => (
                <li key={s.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <Link href={s.href} className="min-w-48 font-medium text-primary underline-offset-4 hover:underline">
                    {s.label}
                  </Link>
                  {s.states?.map((st) => (
                    <Link
                      key={st}
                      href={withState(s.href, st)}
                      className="rounded-full bg-surface-2 px-2.5 py-1 text-sm hover:bg-border"
                    >
                      {st}
                    </Link>
                  ))}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </SimpleShell>
  );
}
