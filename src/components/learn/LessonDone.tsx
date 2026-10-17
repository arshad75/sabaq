"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { LessonResult, Outcome } from "@/lib/learn/progress";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LightMotes } from "./LightMotes";
import { Mascot } from "./Mascot";
import { Star8 } from "./Star8";

function StatCard({ icon, label, value, tone }: { icon: IconName; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-2 py-3 text-center shadow-sm">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={cn("mt-1 flex items-center justify-center gap-1.5 text-2xl font-bold", tone)}>
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
      {at === "lesson" && <LightMotes />}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8 text-center">
        {at === "lesson" && (
          <>
            <Star8 size={168} fill="var(--primary)" glow className="animate-pop-in">
              <Mascot mood="cheer" size={112} />
            </Star8>
            <h1 className="text-3xl font-bold sm:text-4xl">{review ? "Practice complete!" : perfect ? "MashaAllah, perfect!" : "Lesson complete!"}</h1>
            {!review && (
              <ul className="flex items-end gap-3" aria-label={`${outcome.stars} of 3 lamps lit`}>
                {[1, 2, 3].map((n) => (
                  <li
                    key={n}
                    aria-hidden
                    className={cn("animate-pop-in", n <= outcome.stars ? "text-star animate-glow" : "text-border")}
                    style={{ animationDelay: `${0.25 + n * 0.2}s` } as CSSProperties}
                  >
                    <Icon name="lantern" size={n === 2 ? 64 : 52} fill={n <= outcome.stars ? "currentColor" : "none"} strokeWidth={1.5} />
                  </li>
                ))}
              </ul>
            )}
            <div className="grid w-full grid-cols-3 gap-3">
              <StatCard icon="spark" label="Noor earned" value={`+${outcome.xp}`} tone="text-star" />
              <StatCard icon="target" label={perfect ? "Amazing" : "Accuracy"} value={`${accuracy}%`} tone="text-success" />
              <StatCard icon="clock" label="Time" value={time(result.ms)} tone="text-mark-slip" />
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
            <span className="animate-pop-in grid size-40 place-items-center rounded-full bg-tile-sky text-mark-slip">
              <Icon name="moon" size={96} fill="currentColor" strokeWidth={1} />
            </span>
            <p className="text-7xl font-black text-mark-slip">{outcome.streakAfter}</p>
            <h1 className="text-3xl font-bold">days in a row!</h1>
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
            className="min-h-14 w-full rounded-full bg-primary text-lg font-semibold text-primary-fg shadow-sm transition hover:brightness-110"
          >
            Continue
          </button>
        </div>
      </footer>
    </div>
  );
}
