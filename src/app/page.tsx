import Link from "next/link";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/shell/AppShell";
import { TryIt } from "@/components/landing/TryIt";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MarkLegend } from "@/components/ui/Indicators";

const WHY: { icon: IconName; problem: string; answer: string }[] = [
  {
    icon: "eye",
    problem: "A phone camera can’t show which letter a small finger is on.",
    answer: "The teacher sees the exact letter, highlighted, as the child moves.",
  },
  {
    icon: "wifi",
    problem: "Video freezes when the internet is weak.",
    answer: "Only tiny messages travel. Each tap is smaller than this sentence.",
  },
  {
    icon: "note",
    problem: "Corrections are forgotten by the next lesson.",
    answer: "Every mark is kept, so the next lesson starts where help is needed.",
  },
];

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "key",
    title: "Join with a six-letter code",
    body: "The teacher reads out the code on the call. The child types it on the tablet. No app to install.",
  },
  {
    icon: "eye",
    title: "Read together",
    body: "The child taps the letter she’s on. The teacher follows along on a phone or tablet, anywhere in the world.",
  },
  {
    icon: "edit",
    title: "Mark and remember",
    body: "The teacher marks the word. The child sees it straight away, and the family can look back on every lesson.",
  },
];

const AUDIENCES: { icon: IconName; title: string; points: string[] }[] = [
  {
    icon: "users",
    title: "For parents",
    points: [
      "See what was covered and what needs practice after each lesson.",
      "You approve every teacher, and can remove one at any time.",
      "Export or delete your child’s data whenever you like.",
    ],
  },
  {
    icon: "user",
    title: "For teachers",
    points: [
      "Know exactly where the child is, even on a slow connection.",
      "Mark with one tap: repeat, pronunciation, tajweed, slip or good.",
      "Pages that need work rise to the top of your dashboard.",
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Do we still need WhatsApp or Meet?",
    a: "Yes. Keep your usual call for voice. Sabaq only shares the page, so it keeps working even when video doesn’t.",
  },
  {
    q: "Which books can we read?",
    a: "The Noorani Qaida today. Quran pages come next, from a verified text source; we never type the text ourselves.",
  },
  {
    q: "Who runs Sabaq? Is there a catch?",
    a: "Sabaq is a free, open-source community project. There are no ads, no payments, and your data is never sold.",
  },
  {
    q: "What do you store about my child?",
    a: "A nickname, their lessons and their marks. No birthday, no photo, and no recordings unless you switch them on.",
  },
];

function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-muted">
      <Icon name="check" className="mt-0.5 shrink-0 text-success" /> {children}
    </li>
  );
}

export default function Home() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden rounded-3xl px-5 py-12 text-center sm:px-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_70%)]"
        />
        <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
          <Icon name="shield" size={16} /> Open source · free for every family
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Read together, <span className="text-primary">even when you’re apart.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-muted">
          Sabaq puts a child and their Quran teacher on the same page, live. The teacher sees exactly where the
          child is reading and marks mistakes right on the word, from the other side of the world.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="#try" size="lg" icon="target">
            Try it on this page
          </ButtonLink>
          <ButtonLink href="/join" size="lg" variant="secondary" icon="play">
            Join a lesson
          </ButtonLink>
        </div>
        <p className="mt-5 text-sm text-muted">
          Or on your own:{" "}
          <Link href="/practice" className="font-medium text-primary underline-offset-4 hover:underline">
            practise the Qaida
          </Link>{" "}
          ·{" "}
          <Link href="/listen" className="font-medium text-primary underline-offset-4 hover:underline">
            listen to a recitation
          </Link>
        </p>
      </section>

      <section id="try" aria-labelledby="try-title" className="scroll-mt-6 py-6">
        <div className="mb-6 text-center">
          <h2 id="try-title" className="text-3xl font-semibold tracking-tight">
            Try it right here
          </h2>
          <p className="mt-2 text-muted">
            Tap a letter on the tablet and watch it reach the teacher’s phone. Then mark it, as the teacher would.
          </p>
        </div>
        <TryIt />
      </section>

      <section aria-labelledby="why" className="py-14">
        <h2 id="why" className="text-3xl font-semibold tracking-tight">
          Why we made Sabaq
        </h2>
        <p className="mt-3 max-w-3xl text-muted">
          Many children learn with a teacher in another country, over a video call. It works, but it’s hard for
          the teacher to follow, and harder still on a weak connection. Sabaq takes the reading off the camera.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {WHY.map((w) => (
            <li key={w.problem} className="rounded-2xl border border-border bg-surface p-6">
              <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name={w.icon} />
              </span>
              <p className="text-sm text-muted">{w.problem}</p>
              <p className="mt-2 font-medium">{w.answer}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="rounded-3xl bg-surface-2 px-5 py-12 sm:px-10">
        <h2 id="how" className="text-3xl font-semibold tracking-tight">
          How a lesson goes
        </h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-fg">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 font-medium">Five kinds of feedback, each with its own colour and symbol:</p>
          <MarkLegend />
        </div>
      </section>

      <section aria-label="Who it’s for" className="grid gap-4 py-14 md:grid-cols-2">
        {AUDIENCES.map((a) => (
          <div key={a.title} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Icon name={a.icon} className="text-primary" /> {a.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {a.points.map((p) => (
                <Check key={p}>{p}</Check>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="learn" className="rounded-3xl bg-primary px-6 py-10 text-primary-fg sm:px-10">
        <h2 id="learn" className="text-3xl font-semibold tracking-tight">
          Looking for a teacher?
        </h2>
        <p className="mt-3 max-w-2xl opacity-90">
          Create an account and tell us a little about your child. We’ll arrange a first lesson with one of the
          teachers using Sabaq, and if it suits you both, they’ll carry on from there.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-flex min-h-14 items-center gap-2 rounded-xl bg-primary-fg px-6 text-lg font-medium text-primary hover:brightness-95"
        >
          <Icon name="calendar" /> Ask for a first lesson
        </Link>
        <p className="mt-4 text-sm opacity-80">Already have a teacher? They can invite you instead.</p>
      </section>

      <section aria-labelledby="privacy" className="mt-14 rounded-2xl border border-border bg-surface p-6">
        <h2 id="privacy" className="flex items-center gap-2 text-xl font-semibold">
          <Icon name="shield" className="text-primary" /> Built for children’s privacy
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <Check>A nickname only. No birthdays, no photos.</Check>
          <Check>Recordings are off unless a parent turns them on.</Check>
          <Check>Parents approve every teacher.</Check>
          <Check>Export or delete everything at any time.</Check>
        </ul>
        <Link
          href="/privacy"
          className="mt-4 inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          Read what we store
        </Link>
      </section>

      <section aria-labelledby="faq" className="py-14">
        <h2 id="faq" className="text-3xl font-semibold tracking-tight">
          Questions families ask
        </h2>
        <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <Icon name="chevronDown" className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
