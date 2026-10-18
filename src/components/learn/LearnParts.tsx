"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { letter } from "@/lib/learn/curriculum";
import { GOALS, learnedLetters, strengthOf, streak, dayKey, type LearnerData } from "@/lib/learn/progress";
import { addLearner, switchLearner, type Learner, type LearnerColor, type LearnStore } from "@/lib/learn/store";
import { claimNewLearners, firstName, useSyncState } from "@/lib/learn/sync";
import { googleAuth, supabaseAuth } from "@/lib/auth/mode";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Mascot } from "./Mascot";
import { Ring } from "./Ring";

export const COLOR_BG: Record<LearnerColor, string> = {
  mint: "bg-tile-mint",
  sky: "bg-tile-sky",
  peach: "bg-tile-peach",
  lilac: "bg-tile-lilac",
  sun: "bg-tile-sun",
  rose: "bg-tile-rose",
};
const COLORS = Object.keys(COLOR_BG) as LearnerColor[];

export function Avatar({ learner, size = "md" }: { learner: Learner; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-border",
        COLOR_BG[learner.color],
        size === "lg" ? "size-20 text-3xl" : "size-9 text-base",
      )}
    >
      {learner.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function StatsBar({ learner, data, onLearners }: { learner: Learner; data: LearnerData; onLearners: () => void }) {
  const today = dayKey();
  const todayXp = data.days[today] ?? 0;
  const s = streak(data.days, today);
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-border bg-surface px-3 py-2">
      <button
        type="button"
        onClick={onLearners}
        aria-label={`Learning as ${learner.name}. Switch learner`}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1.5 font-semibold hover:bg-surface-2"
      >
        <Avatar learner={learner} />
        <span className="hidden max-w-32 truncate sm:inline">{learner.name}</span>
      </button>
      <div className="flex items-center gap-3 sm:gap-5">
        <span
          className={cn("inline-flex items-center gap-1 text-lg font-bold", todayXp > 0 ? "text-mark-slip" : "text-muted")}
          aria-label={`${s} day streak`}
          data-testid="streak"
        >
          <Icon name="moon" size={24} fill={todayXp > 0 ? "currentColor" : "none"} /> {s}
        </span>
        <span className="inline-flex items-center gap-1 text-lg font-bold text-star" aria-label={`${data.xp} Noor`} data-testid="xp">
          <Icon name="spark" size={22} fill="currentColor" /> {data.xp}
        </span>
        <Ring value={todayXp} max={data.goal} size={44} stroke={5} label={`${todayXp} of ${data.goal} Noor today`}>
          <Icon name="target" size={18} className={todayXp >= data.goal ? "text-star" : "text-muted"} />
        </Ring>
      </div>
    </div>
  );
}

export function Tabs({ at, go }: { at: "path" | "review" | "me"; go: (path: string) => void }) {
  const tabs = [
    { id: "path", path: "", label: "Learn", icon: "home" },
    { id: "review", path: "review", label: "Practise", icon: "dots" },
    { id: "me", path: "me", label: "Me", icon: "user" },
  ] as const;
  return (
    <nav aria-label="Learning" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
      {tabs.map((t) => (
        <a
          key={t.id}
          href={t.path ? `#/${t.path}` : "#/"}
          onClick={(e) => {
            e.preventDefault();
            go(t.path);
          }}
          aria-current={at === t.id ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold",
            at === t.id ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          <Icon name={t.icon} size={20} /> {t.label}
        </a>
      ))}
    </nav>
  );
}

/** Where the journey is saved: this device, or the family account. */
export function AccountBar() {
  const sync = useSyncState();
  if (!supabaseAuth || sync.status === "idle" || sync.status === "checking") return null;
  if (sync.status === "guest")
    return <SignInPrompt />;
  let line: { icon: IconName; text: string };
  if (sync.status === "offline")
    line = { icon: "wifiOff", text: "Offline. Your progress is safe on this device and will be saved when you’re back online." };
  else if (sync.status === "syncing") line = { icon: "repeat", text: "Saving to your account…" };
  else if (sync.canSync) line = { icon: "check", text: `Saved to ${sync.accountName}’s account. Pick up on any device.` };
  else line = { icon: "info", text: "Teacher accounts keep the journey on this device." };
  return (
    <p className="flex items-center gap-2 text-sm text-muted" data-testid="sync-status" role="status">
      <Icon name={line.icon} size={16} className={sync.status === "synced" && sync.canSync ? "text-success" : undefined} />
      {line.text}
    </p>
  );
}

function SignInPrompt() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-border bg-surface p-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-semibold">Keep your journey safe</p>
        <p className="text-sm text-muted">Sign in free to save progress to your family account and carry on from any device.</p>
      </div>
      {googleAuth ? (
        <GoogleButton next="/learn" className="sm:w-72" />
      ) : (
        <a href="/login?next=/learn" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 font-semibold text-primary-fg">
          Sign in
        </a>
      )}
    </div>
  );
}

function LearnerForm({ first, onDone }: { first: boolean; onDone: () => void }) {
  const sync = useSyncState();
  const signedIn = sync.status === "syncing" || sync.status === "synced";
  const [name, setName] = useState(first && signedIn ? firstName(sync.accountName) : "");
  const [color, setColor] = useState<LearnerColor>("mint");
  const [goal, setGoal] = useState(20);
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        addLearner(name, color, goal);
        void claimNewLearners();
        onDone();
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="learner-name" className="block text-lg font-semibold">
          {first ? "What shall we call you?" : "Learner’s nickname"}
        </label>
        <input
          id="learner-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="off"
          placeholder="A nickname, like Sara"
          className="min-h-14 w-full rounded-2xl border-2 border-border bg-surface px-4 text-lg"
        />
        <p className="text-sm text-muted">
          {signedIn && sync.canSync ? "A nickname is plenty. Saved to your family account." : "A nickname is plenty. It stays on this device."}
        </p>
      </div>
      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Pick a colour</legend>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => (
            <label key={c} className={cn("grid size-14 cursor-pointer place-items-center rounded-full ring-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus", COLOR_BG[c], color === c ? "ring-4 ring-primary" : "ring-border")}>
              <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} className="sr-only" aria-label={c} />
              {color === c && <Icon name="check" size={24} className="text-primary" />}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Daily goal</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GOALS.map((g) => (
            <label
              key={g.xp}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus",
                goal === g.xp ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface",
              )}
            >
              <input type="radio" name="goal" value={g.xp} checked={goal === g.xp} onChange={() => setGoal(g.xp)} className="sr-only" />
              <span className="font-bold">{g.label}</span>
              <span className="text-sm text-muted">{g.xp} Noor a day</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        style={{ "--edge": "color-mix(in srgb, var(--primary) 55%, black)" } as CSSProperties}
        className="min-h-14 w-full rounded-full bg-primary text-lg font-semibold text-primary-fg shadow-sm transition hover:brightness-110"
      >
        {first ? "Start learning" : "Add learner"}
      </button>
    </form>
  );
}

export function Welcome({ onDone }: { onDone: () => void }) {
  const sync = useSyncState();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {supabaseAuth && sync.status === "guest" && <SignInPrompt />}
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Mascot size={128} className="animate-float" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Learn to read, one letter at a time</h1>
          <p className="mt-2 text-lg text-muted">
            Short, playful lessons on the Arabic letters, in the same order as the Noorani Qaida. A few minutes a day is all it
            takes.
          </p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {(
          [
            { icon: "volume", t: "Hear every letter", b: "Tap to hear its name" },
            { icon: "book", t: "Use your Qaida", b: "Find letters on real pages" },
            { icon: "moon", t: "Grow a crescent", b: "Days in a row, Noor and badges" },
          ] satisfies { icon: IconName; t: string; b: string }[]
        ).map((x) => (
          <li key={x.t} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-primary">
              <Icon name={x.icon} />
            </span>
            <span>
              <span className="block font-semibold">{x.t}</span>
              <span className="block text-sm text-muted">{x.b}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="rounded-3xl border-2 border-border bg-surface p-5 sm:p-6">
        <LearnerForm first onDone={onDone} />
      </div>
      <p className="flex items-center justify-center gap-2 text-sm text-muted">
        <Icon name="shield" size={16} />
        {sync.status === "synced" && sync.canSync
          ? `Saved to ${sync.accountName}’s account, so you can carry on from any device.`
          : sync.status === "synced"
            ? "Teacher accounts keep the journey on this device."
            : "No account needed. Progress is saved on this device only and never sent anywhere."}
      </p>
    </div>
  );
}

export function LearnersView({ store, onDone }: { store: LearnStore; onDone: () => void }) {
  const [adding, setAdding] = useState(false);
  const today = dayKey();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Who’s learning?</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {store.learners.map((l) => {
          const d = store.data[l.id];
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => {
                  switchLearner(l.id);
                  onDone();
                }}
                aria-current={store.active === l.id ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left hover:bg-surface-2",
                  store.active === l.id ? "border-primary bg-primary-soft" : "border-border bg-surface",
                )}
              >
                <Avatar learner={l} size="lg" />
                <span>
                  <span className="block text-xl font-bold">{l.name}</span>
                  <span className="flex gap-3 text-sm text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="moon" size={14} /> {d ? streak(d.days, today) : 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="spark" size={14} /> {d?.xp ?? 0} Noor
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {adding ? (
        <div className="rounded-3xl border-2 border-border bg-surface p-5">
          <LearnerForm first={false} onDone={onDone} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border font-semibold hover:bg-surface-2"
        >
          <Icon name="plus" /> Add a learner
        </button>
      )}
    </div>
  );
}

export function ReviewIntro({ data, onStart, onPath }: { data: LearnerData; onStart: () => void; onPath: () => void }) {
  const learned = learnedLetters(data);
  const weak = [...learned].sort((a, b) => strengthOf(data, a) - strengthOf(data, b)).slice(0, 8);
  if (learned.length < 2)
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-surface p-8 text-center">
        <Mascot mood="think" size={110} />
        <h1 className="text-2xl font-bold">Practice opens after your first lesson</h1>
        <p className="text-muted">Learn a few letters first, then come back here to make them strong.</p>
        <button type="button" onClick={onPath} className="min-h-12 rounded-2xl bg-primary px-6 font-bold text-primary-fg">
          Go to my first lesson
        </button>
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-tile-lilac p-6 text-center sm:flex-row sm:text-left">
        <Mascot mood="think" size={110} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">Practise your trickiest letters</h1>
          <p className="mt-1 text-muted">A quick round on the letters that need a little more love. Every practice keeps your streak alive.</p>
        </div>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8" aria-label="Letters in this practice">
        {weak.map((id) => (
          <li key={id} className="flex flex-col items-center rounded-2xl border-2 border-border bg-surface p-2">
            <span lang="ar" dir="rtl" className="font-arabic text-4xl leading-[1.4]">
              {letter(id).glyph}
            </span>
            <span className="text-xs font-semibold">{letter(id).en}</span>
            <Strength value={strengthOf(data, id)} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onStart}
        data-testid="start-review"
        style={{ "--edge": "color-mix(in srgb, var(--primary) 55%, black)" } as CSSProperties}
        className="min-h-14 w-full rounded-full bg-primary text-lg font-semibold text-primary-fg shadow-sm transition hover:brightness-110"
      >
        Start practice · +10 Noor
      </button>
    </div>
  );
}

export function Strength({ value }: { value: number }) {
  return (
    <span className="mt-1 flex gap-0.5" role="img" aria-label={`Strength ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn("h-1.5 w-2 rounded-full", n <= value ? (value >= 4 ? "bg-success" : value >= 2 ? "bg-star" : "bg-mark-repeat") : "bg-surface-2")} />
      ))}
    </span>
  );
}
