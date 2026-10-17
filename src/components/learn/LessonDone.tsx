"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { LessonResult, Outcome } from "@/lib/learn/progress";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Confetti } from "./Confetti";
import { Mascot } from "./Mascot";

function StatCard({ icon, label, value, tone }: { icon: IconName; label: string; value: string; tone: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border-2 text-center", tone)}>
      <p className="px-2 py-1 text-xs font-bold tracking-wide uppercase">{label}</p>
      <p className="flex items-center justify-center gap-1.5 bg-surface px-3 py-3 text-2xl font-bold text-fg">
        <Icon name={icon} size={22} /> {value}
      </p>
    </div>
  );
}

const time = (ms: number) => {
  const s = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function LessonDone({
  result,
  outcome,
  review,
  onContinue,
}: {
  result: LessonResult;
  outcome: Outcome;
  review: boolean;
  onContinue: () => void;
}) {
  // Celebrations come one after another: the lesson, then the streak, then any badges.
  const steps = ["lesson", ...(outcome.streakAfter > outcome.streakBefore ? ["streak"] : []), ...(outcome.newBadges.length ? ["badges"] : [])];
  const [step, setStep] = useState(0);
  const at = steps[step];
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 100;
  const perfect = accuracy === 100;
  const advance = () => (step + 1 < steps.length ? setStep(step + 1) : onContinue());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.target as HTMLElement | null)?.tagName !== "BUTTON") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div data-no-say role="dialog" aria-modal="true" aria-label="Lesson complete" className="fixed inset-0 z-40 flex flex-col bg-bg" data-testid="lesson-done">
      {at === "lesson" && <Confetti />}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8 text-center">
        {at === "lesson" && (
          <>
            <Mascot mood="cheer" size={140} className="animate-pop-in" />
            <h1 className="text-3xl font-bold text-star sm:text-4xl">{review ? "Practice complete!" : perfect ? "Perfect lesson!" : "Lesson complete!"}</h1>
            {!review && (
              <ul className="flex gap-2" aria-label={`${outcome.stars} of 3 stars`}>
                {[1, 2, 3].map((n) => (
                  <li
                    key={n}
                    aria-hidden
                    className={cn("animate-pop-in", n <= outcome.stars ? "text-star" : "text-surface-2")}
                    style={{ animationDelay: `${0.25 + n * 0.2}s` } as CSSProperties}
                  >
                    <Icon name="star" size={n === 2 ? 64 : 52} fill="currentColor" strokeWidth={1.5} />
                  </li>
                ))}
              </ul>
            )}
            <div className="grid w-full grid-cols-3 gap-3">
              <StatCard icon="zap" label="Total XP" value={`+${outcome.xp}`} tone="border-star bg-star text-primary-fg" />
              <StatCard icon="target" label={perfect ? "Amazing" : "Accuracy"} value={`${accuracy}%`} tone="border-success bg-success text-primary-fg" />
              <StatCard icon="clock" label="Time" value={time(result.ms)} tone="border-mark-slip bg-mark-slip text-primary-fg" />
            </div>
            {outcome.goalJustMet && (
              <p className="inline-flex items-center gap-2 rounded-full bg-tile-sun px-4 py-2 font-semibold">
                <Icon name="target" className="text-star" /> Daily goal reached!
              </p>
            )}
          </>
        )}
        {at === "streak" && (
          <>
            <span className="animate-pop-in grid size-40 place-items-center rounded-full bg-tile-peach text-mark-repeat">
              <Icon name="flame" size={96} fill="currentColor" strokeWidth={1} />
            </span>
            <p className="text-7xl font-black text-mark-repeat">{outcome.streakAfter}</p>
            <h1 className="text-3xl font-bold">day streak!</h1>
            <p className="max-w-sm text-lg text-muted">
              {outcome.streakAfter === 1 ? "You started a streak. Come back tomorrow to keep it going!" : "Keep it up! A little every day makes reading strong."}
            </p>
          </>
        )}
        {at === "badges" && (
          <>
            <h1 className="text-3xl font-bold">{outcome.newBadges.length === 1 ? "New badge!" : "New badges!"}</h1>
            <ul className="grid w-full gap-3 sm:grid-cols-2">
              {outcome.newBadges.map((b, i) => (
                <li
                  key={b.id}
                  className="animate-pop-in flex items-center gap-3 rounded-2xl bg-tile-sun p-4 text-left"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-surface text-star shadow-sm">
                    <Icon name={b.icon} size={28} />
                  </span>
                  <span>
                    <span className="block text-lg font-bold">{b.title}</span>
                    <span className="block text-sm text-muted">{b.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <footer className="border-t-2 border-border">
        <div className="mx-auto flex w-full max-w-xl px-4 py-4">
          <button
            type="button"
            autoFocus
            onClick={advance}
            style={{ "--edge": "color-mix(in srgb, var(--primary) 55%, black)" } as CSSProperties}
            className="press-3d min-h-14 w-full rounded-2xl bg-primary text-lg font-bold tracking-wide text-primary-fg uppercase"
          >
            Continue
          </button>
        </div>
      </footer>
    </div>
  );
}
