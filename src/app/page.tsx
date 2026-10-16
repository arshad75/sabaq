import Link from "next/link";
import { PublicShell } from "@/components/shell/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MarkLegend } from "@/components/ui/Indicators";
import { ImagePageView, QaidaCredit } from "@/components/reading/ImagePageView";
import { cellCenter, qaidaCells } from "@/lib/qaida/layout";

const DEMO_PAGE = 1;

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "book",
    title: "Your child reads on a tablet",
    body: "Big, clear pages. She taps the word she’s on, and her place moves with her.",
  },
  {
    icon: "eye",
    title: "The teacher follows live",
    body: "From anywhere, on a phone or tablet. No more squinting at a wobbly camera.",
  },
  {
    icon: "edit",
    title: "Mistakes are marked on the word",
    body: "The child sees each mark appear, and every lesson builds a progress record.",
  },
];

const STATS: { value: string; label: string }[] = [
  { value: "6", label: "letters to join a lesson" },
  { value: "<1s", label: "for the teacher to see a tap" },
  { value: "0", label: "photos, birthdays or video stored" },
];

const AUDIENCES: { icon: IconName; title: string; points: string[] }[] = [
  {
    icon: "users",
    title: "For parents",
    points: [
      "See what was covered and what needs practice after every lesson.",
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

const DEMO_STEPS: { title: string; body: string }[] = [
  { title: "Create a free account", body: "Takes two minutes. Just a parent’s name, email and a password." },
  { title: "Book a demo class", body: "Pick a time that suits your family. Bring your child and a tablet." },
  { title: "Meet your teacher", body: "If it’s a good fit, we link your child to the teacher’s class." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Do we still need WhatsApp or Meet?",
    a: "Yes. Keep your usual call for voice. Sabaq only shares the page, so it works even when video doesn’t.",
  },
  {
    q: "Which books can we read?",
    a: "The Noorani Qaida today. Quran pages are coming next, from a verified text source.",
  },
  {
    q: "What does it cost?",
    a: "Nothing during the pilot. Sabaq is open source.",
  },
  {
    q: "What do you store about my child?",
    a: "A nickname, their lessons and their marks. No birthday, photo or recordings unless you switch them on.",
  },
];

function LivePreview() {
  const cells = qaidaCells(DEMO_PAGE);
  const find = (line: number, word: number) => cells.find((c) => c.line === line && c.word === word);
  const reading = find(3, 3);
  const marked = find(2, 2);
  const position = reading ? cellCenter(reading) : null;
  const pins = marked ? [{ id: "demo", point: cellCenter(marked), markType: "tajweed" as const, label: "1" }] : [];

  return (
    <div
      role="img"
      aria-label="Preview: the child’s tablet and the teacher’s phone show the same Qaida page, with the child’s place highlighted and a teacher’s mark"
      className="relative mx-auto w-full max-w-md pb-10 lg:max-w-none"
    >
      <div className="rounded-[2rem] border border-border bg-fg/90 p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between px-2 text-xs font-medium text-bg/80">
          <span>Child’s tablet</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-success opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Live
          </span>
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white">
          <ImagePageView page={DEMO_PAGE} position={position} pins={pins} className="rounded-none shadow-none ring-0" />
        </div>
      </div>

      <div className="absolute -bottom-2 left-0 w-[42%] rounded-[1.5rem] border border-border bg-fg/90 p-2 shadow-2xl sm:-left-4">
        <p className="mb-1 px-1 text-[10px] font-medium text-bg/80">Teacher’s phone</p>
        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white">
          <ImagePageView page={DEMO_PAGE} position={position} pins={pins} className="rounded-none shadow-none ring-0" />
        </div>
      </div>

      <div className="absolute right-2 -bottom-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-lg">
        <Icon name="wifi" size={14} className="text-primary" />
        Synced in under a second
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden rounded-3xl px-5 pt-6 pb-12 sm:px-8 sm:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,var(--primary-soft),transparent_70%)]"
        />
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
              <Icon name="star" size={16} /> Free pilot · now booking demo classes
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Your child’s Quran lesson, <span className="text-primary">on the same page.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              The teacher sees exactly where your child is reading, from anywhere in the world, and marks mistakes
              right on the word. Keep your usual WhatsApp or Meet call for voice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg" icon="calendar">
                Book a free demo class
              </ButtonLink>
              <ButtonLink href="/join" size="lg" variant="secondary" icon="play">
                Join a lesson
              </ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              <li className="inline-flex items-center gap-1.5">
                <Icon name="wifi" size={16} className="text-primary" /> Works on slow connections
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="shield" size={16} className="text-primary" /> Parents stay in control
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="lock" size={16} className="text-primary" /> No video sent
              </li>
            </ul>
          </div>
          <div>
            <LivePreview />
            <QaidaCredit className="mt-4 text-center lg:text-left" />
          </div>
        </div>
      </section>

      <section aria-label="At a glance" className="grid gap-3 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-5 text-center">
            <p className="text-4xl font-semibold tracking-tight text-primary">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="how" className="py-14">
        <h2 id="how" className="text-3xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-border bg-surface p-6">
              <span aria-hidden className="absolute top-4 right-5 text-5xl font-semibold text-primary/15">
                {i + 1}
              </span>
              <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name={s.icon} />
              </span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-2xl border border-border bg-surface-2 p-5">
          <p className="mb-3 font-medium">Five kinds of feedback, each with its own colour and symbol:</p>
          <MarkLegend />
        </div>
      </section>

      <section aria-label="Who it’s for" className="grid gap-4 md:grid-cols-2">
        {AUDIENCES.map((a) => (
          <div key={a.title} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Icon name={a.icon} className="text-primary" /> {a.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {a.points.map((p) => (
                <li key={p} className="flex gap-2 text-muted">
                  <Icon name="check" className="mt-0.5 shrink-0 text-success" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section
        aria-labelledby="demo"
        className="my-14 rounded-3xl bg-primary px-6 py-10 text-primary-fg sm:px-10"
      >
        <h2 id="demo" className="text-3xl font-semibold tracking-tight">
          Try a free demo class
        </h2>
        <p className="mt-2 max-w-2xl opacity-90">
          See how it feels before you commit. No payment, no card, no app to install.
        </p>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {DEMO_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-fg font-semibold text-primary">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm opacity-90">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link
          href="/signup"
          className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-xl bg-primary-fg px-6 text-lg font-medium text-primary hover:brightness-95"
        >
          <Icon name="calendar" /> Book a free demo class
        </Link>
      </section>

      <section aria-labelledby="privacy" className="rounded-2xl border border-border bg-surface p-6">
        <h2 id="privacy" className="flex items-center gap-2 text-xl font-semibold">
          <Icon name="shield" className="text-primary" /> Built for children’s privacy
        </h2>
        <ul className="mt-4 grid gap-2 text-muted sm:grid-cols-2">
          <li className="flex gap-2">
            <Icon name="check" className="mt-0.5 shrink-0 text-success" /> A nickname only. No birthdays, no photos.
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="mt-0.5 shrink-0 text-success" /> Recordings are off unless a parent turns
            them on.
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="mt-0.5 shrink-0 text-success" /> Parents approve every teacher.
          </li>
          <li className="flex gap-2">
            <Icon name="check" className="mt-0.5 shrink-0 text-success" /> Export or delete everything at any time.
          </li>
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
          Questions parents ask
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
