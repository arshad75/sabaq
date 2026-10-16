import Link from "next/link";
import { PublicShell } from "@/components/shell/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MarkLegend } from "@/components/ui/Indicators";

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "book",
    title: "The child reads on a tablet",
    body: "Large, clear text. She taps the word she is on and her place moves with her.",
  },
  {
    icon: "eye",
    title: "The teacher follows live",
    body: "From anywhere, on a phone or tablet. No more squinting at a phone camera.",
  },
  {
    icon: "edit",
    title: "Mistakes are marked on the word",
    body: "Repeat, pronunciation, tajweed, memorisation slip, or good. Marks build a progress record.",
  },
];

export default function Home() {
  return (
    <PublicShell>
      <section className="py-6 sm:py-12">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
          <Icon name="shield" size={16} /> Free, open source, no tracking
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Shared reading for remote Quran lessons
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Sabaq puts the teacher and the child on the same page, live. Keep your usual WhatsApp or Meet call for
          voice; this app handles the reading.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/join" size="lg" icon="play">
            Join a session
          </ButtonLink>
          <ButtonLink href="/login" size="lg" variant="secondary">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" size="lg" variant="ghost">
            Create an account
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="how" className="py-8">
        <h2 id="how" className="text-2xl font-semibold">
          How it works
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icon name={s.icon} />
                </span>
                <span className="text-sm font-medium text-muted">Step {i + 1}</span>
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <MarkLegend />
        </div>
      </section>

      <section aria-labelledby="privacy" className="my-8 rounded-2xl border border-border bg-surface p-6">
        <h2 id="privacy" className="text-xl font-semibold">
          Built for children’s privacy
        </h2>
        <ul className="mt-3 grid gap-2 text-muted sm:grid-cols-2">
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
        <Link href="/privacy" className="mt-4 inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline">
          Read what we store
        </Link>
      </section>
    </PublicShell>
  );
}
