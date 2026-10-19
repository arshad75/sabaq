"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ayahCount } from "@/lib/audio/recitation";
import { UNITS, isQuranLesson, letter, syllable, type Lesson, type LessonKind, type UnitColor } from "@/lib/learn/curriculum";
import { currentLessonId, isDone, isUnlocked, type LearnerData } from "@/lib/learn/progress";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Mascot } from "./Mascot";
import { Star8 } from "./Star8";

const KIND: Record<LessonKind, { label: string; icon: IconName }> = {
  letters: { label: "New letters", icon: "spark" },
  review: { label: "Station check", icon: "trophy" },
  dots: { label: "Spot the dots", icon: "dots" },
  book: { label: "In my Qaida", icon: "book" },
  shapes: { label: "Letter shapes", icon: "shapes" },
  vowels: { label: "Short vowels", icon: "speech" },
  words: { label: "Quran words", icon: "volume" },
  recite: { label: "Listen and repeat", icon: "wave" },
};

// Deep jewel tones so white text and the gold lattice stay readable in light and dark themes.
const STATION: Record<UnitColor, string> = {
  mint: "from-[#0f6b5f] to-[#0b4f47]",
  sky: "from-[#2f4f8f] to-[#22396b]",
  peach: "from-[#a4502a] to-[#7d3a1d]",
  lilac: "from-[#5f3f86] to-[#462e66]",
  sun: "from-[#8a6300] to-[#694b00]",
  rose: "from-[#9b2f4c] to-[#76223a]",
};

type State = "done" | "current" | "locked";

function preview(lesson: Lesson): string[] {
  if (lesson.kind === "vowels") return (["a", "i", "u"] as const).map((v) => syllable(lesson.letters[0], v).glyph);
  return lesson.letters.slice(0, 7).map((id) => letter(id).glyph);
}

export function Lamps({ lit, size = 16 }: { lit: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${lit} of 3 lamps lit`}>
      {[1, 2, 3].map((n) => (
        <Icon key={n} name="lantern" size={size} className={n <= lit ? "text-star" : "text-border"} fill={n <= lit ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

function LessonRow({
  lesson,
  number,
  state,
  lit,
  open,
  onToggle,
  onStart,
}: {
  lesson: Lesson;
  number: number;
  state: State;
  lit: number;
  open: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const kind = KIND[lesson.kind];
  const label = `${lesson.title}, lesson ${number}, ${state === "done" ? `done, ${lit} lamps lit` : state === "current" ? "up next" : "locked"}`;
  return (
    <li className="relative pl-16 sm:pl-20">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open || state === "current"}
        data-lesson={lesson.id}
        data-state={state}
        onClick={onToggle}
        className="absolute top-1 left-0 rounded-full focus-visible:outline-3 focus-visible:outline-focus"
      >
        <Star8
          size={56}
          fill={state === "done" ? "var(--star)" : state === "current" ? "var(--primary)" : "var(--surface-2)"}
          stroke={state === "locked" ? "var(--border)" : "none"}
          className={state === "current" ? "animate-glow" : undefined}
        >
          <Icon
            name={state === "locked" ? "lock" : state === "done" ? "check" : kind.icon}
            size={22}
            strokeWidth={2.6}
            className={state === "locked" ? "text-muted" : "text-white"}
          />
        </Star8>
      </button>
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 transition-colors",
          state === "current" ? "border-primary/40 bg-primary-soft" : "border-border bg-surface",
          state === "locked" && "opacity-75",
        )}
      >
        <div className="cursor-pointer" onClick={onToggle}>
          <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">
              {kind.label} · {number}
            </span>
            {state === "done" && <Lamps lit={lit} />}
          </p>
          <p className="mt-0.5 text-lg font-semibold">{lesson.title}</p>
          {isQuranLesson(lesson) ? (
            <p className="mt-1 text-sm text-muted">
              Surah {lesson.title} · {ayahCount(lesson.surah!)} ayahs
            </p>
          ) : (
            <p lang="ar" dir="rtl" aria-hidden className="mt-1 flex flex-wrap gap-2 font-arabic text-2xl leading-[1.5] text-muted">
              {preview(lesson).map((g, i) => (
                <span key={i}>{g}</span>
              ))}
            </p>
          )}
        </div>
        {(open || state === "current") && (
          <div className="mt-3 border-t border-border pt-3">
            {state === "locked" ? (
              <p className="text-sm text-muted">Opens after you finish the lesson above.</p>
            ) : (
              <button
                type="button"
                onClick={onStart}
                className={cn(
                  "inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold shadow-sm transition hover:brightness-110",
                  state === "done" ? "bg-surface-2 text-fg" : "bg-primary text-primary-fg",
                )}
              >
                <Icon name={state === "done" ? "repeat" : "play"} size={18} />
                {state === "done" ? "Practise again · +5 Noor" : "Begin · +10 Noor"}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function PathView({ data, name, onStart }: { data: LearnerData; name: string; onStart: (lessonId: string) => void }) {
  const current = currentLessonId(data);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <div className="flex items-end gap-3">
        <Mascot mood={current ? "happy" : "cheer"} size={84} className="animate-float" />
        <div className="relative mb-4 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
          <span aria-hidden className="absolute bottom-4 -left-2 size-4 rotate-45 border-b border-l border-border bg-surface" />
          <p className="text-lg font-semibold">
            {current ? `Assalamu alaikum, ${name}! Ready for today’s lesson?` : `MashaAllah, ${name}! You finished the whole journey.`}
          </p>
        </div>
      </div>
      {UNITS.map((unit, u) => {
        const done = unit.lessons.filter((l) => isDone(data, l.id)).length;
        return (
          <section key={unit.id} aria-labelledby={`unit-${unit.id}`} className="space-y-5">
            <header className={cn("arch relative overflow-hidden bg-linear-to-b px-6 pt-10 pb-6 text-center text-white shadow-md", STATION[unit.color])}>
              <div aria-hidden className="girih absolute inset-0" />
              <div className="relative">
                <p className="text-sm font-semibold tracking-[0.2em] text-[#f5d58a] uppercase">Station {u + 1}</p>
                <h2 id={`unit-${unit.id}`} className="mt-1 text-2xl font-bold sm:text-3xl">
                  {unit.title}
                </h2>
                <p className="mx-auto mt-1 max-w-md text-white/85">{unit.goal}</p>
                <div
                  className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-white/20"
                  role="img"
                  aria-label={`${done} of ${unit.lessons.length} lessons done`}
                >
                  <div className="h-full rounded-full bg-[#f5d58a]" style={{ width: `${(done / unit.lessons.length) * 100}%` }} />
                </div>
              </div>
            </header>
            <ol className="relative space-y-4 before:absolute before:top-4 before:bottom-4 before:left-[26px] before:w-1 before:rounded-full before:bg-linear-to-b before:from-star/70 before:to-border">
              {unit.lessons.map((lesson, i) => {
                const state: State = isDone(data, lesson.id)
                  ? "done"
                  : lesson.id === current && isUnlocked(data, lesson.id)
                    ? "current"
                    : "locked";
                return (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    number={i + 1}
                    state={state}
                    lit={data.lessons[lesson.id]?.stars ?? 0}
                    open={open === lesson.id}
                    onToggle={() => setOpen(open === lesson.id ? null : lesson.id)}
                    onStart={() => onStart(lesson.id)}
                  />
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
