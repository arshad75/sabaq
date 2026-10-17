"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { UNITS, type Lesson, type LessonKind, type UnitColor } from "@/lib/learn/curriculum";
import { currentLessonId, isDone, isUnlocked, type LearnerData } from "@/lib/learn/progress";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Mascot } from "./Mascot";

const KIND_ICON: Record<LessonKind, IconName> = {
  letters: "star",
  review: "trophy",
  dots: "dots",
  book: "book",
  shapes: "shapes",
  vowels: "speech",
};

const UNIT_BG: Record<UnitColor, string> = {
  mint: "bg-tile-mint",
  sky: "bg-tile-sky",
  peach: "bg-tile-peach",
  lilac: "bg-tile-lilac",
  sun: "bg-tile-sun",
  rose: "bg-tile-rose",
};

// A gentle zig-zag, like a path winding down a hill.
const OFFSETS = [0, 1, 1.6, 1, 0, -1, -1.6, -1];

function Node({
  lesson,
  number,
  of,
  state,
  stars,
  offset,
  open,
  onToggle,
  onStart,
}: {
  lesson: Lesson;
  number: number;
  of: number;
  state: "done" | "current" | "locked";
  stars: number;
  offset: number;
  open: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (state !== "current" || !el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state]);
  const edge = state === "done" ? "color-mix(in srgb, var(--star) 60%, black)" : state === "current" ? "color-mix(in srgb, var(--primary) 55%, black)" : "var(--border)";
  const label = `${lesson.title}, lesson ${number} of ${of}, ${state === "done" ? `done, ${stars} stars` : state === "current" ? "up next" : "locked"}`;
  return (
    <li ref={ref} className="relative flex flex-col items-center" style={{ transform: `translateX(${offset * 3.2}rem)` }}>
      {state === "current" && !open && (
        <span className="animate-float absolute -top-11 z-10 rounded-xl border-2 border-border bg-surface px-3 py-1 text-sm font-bold tracking-wide text-primary uppercase shadow-sm">
          Start
          <span aria-hidden className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-border bg-surface" />
        </span>
      )}
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        data-lesson={lesson.id}
        data-state={state}
        onClick={onToggle}
        style={{ "--edge": edge } as CSSProperties}
        className={cn(
          "press-3d relative grid size-[4.5rem] place-items-center rounded-full",
          state === "done" && "bg-star text-primary-fg",
          state === "current" && "animate-pulse-ring bg-primary text-primary-fg",
          state === "locked" && "bg-surface-2 text-muted",
        )}
      >
        <Icon name={state === "locked" ? "lock" : state === "done" && lesson.kind !== "review" ? "check" : KIND_ICON[lesson.kind]} size={32} strokeWidth={2.6} />
      </button>
      {state === "done" && (
        <span aria-hidden className="mt-1.5 flex gap-0.5">
          {[1, 2, 3].map((n) => (
            <Icon key={n} name="star" size={14} className={n <= stars ? "text-star" : "text-border"} fill="currentColor" />
          ))}
        </span>
      )}
      {open && (
        <div
          data-popover
          className={cn(
            "animate-pop-in absolute top-full z-20 mt-3 w-72 rounded-2xl p-4 text-left shadow-xl",
            state === "locked" ? "border-2 border-border bg-surface" : state === "done" ? "bg-star text-primary-fg" : "bg-primary text-primary-fg",
          )}
          style={{ transform: `translateX(${-offset * 3.2}rem)` }}
        >
          <p className="text-lg font-bold">{lesson.title}</p>
          <p className={cn("text-sm", state === "locked" ? "text-muted" : "opacity-90")}>
            {state === "locked" ? "Finish the lessons before this to unlock it." : `Lesson ${number} of ${of}`}
          </p>
          {state !== "locked" && (
            <button
              type="button"
              onClick={onStart}
              className="mt-3 min-h-12 w-full rounded-xl bg-surface text-base font-bold tracking-wide uppercase shadow-[0_4px_0_rgb(0_0_0/0.15)] hover:brightness-95"
              style={{ color: state === "done" ? "var(--star)" : "var(--primary)" }}
            >
              {state === "done" ? "Practise again +5 XP" : "Start +10 XP"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function PathView({ data, name, onStart }: { data: LearnerData; name: string; onStart: (lessonId: string) => void }) {
  const current = currentLessonId(data);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-lesson], [data-popover]")) setOpen(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="space-y-10">
      <div className="flex items-end gap-3">
        <Mascot mood={current ? "happy" : "cheer"} size={84} className="animate-float" />
        <div className="relative mb-4 rounded-2xl border-2 border-border bg-surface px-4 py-3 shadow-sm">
          <span aria-hidden className="absolute bottom-4 -left-2 size-4 rotate-45 border-b-2 border-l-2 border-border bg-surface" />
          <p className="text-lg font-semibold">
            {current ? `Assalamu alaikum, ${name}! Ready for today’s lesson?` : `MashaAllah, ${name}! You finished the whole path.`}
          </p>
        </div>
      </div>
      {UNITS.map((unit, u) => {
        const done = unit.lessons.filter((l) => isDone(data, l.id)).length;
        const start = UNITS.slice(0, u).reduce((s, x) => s + x.lessons.length, 0);
        return (
          <section key={unit.id} aria-labelledby={`unit-${unit.id}`} className="space-y-10">
            <header className={cn("flex items-center justify-between gap-4 rounded-2xl p-5", UNIT_BG[unit.color])}>
              <div>
                <p className="text-sm font-bold tracking-wide text-muted uppercase">Unit {u + 1}</p>
                <h2 id={`unit-${unit.id}`} className="text-2xl font-bold">
                  {unit.title}
                </h2>
                <p className="text-muted">{unit.goal}</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface/80 px-3 py-1 text-sm font-bold" aria-label={`${done} of ${unit.lessons.length} lessons done`}>
                {done}/{unit.lessons.length}
              </span>
            </header>
            <ol className="flex flex-col items-center gap-8 pb-4">
              {unit.lessons.map((lesson, i) => {
                const offset = OFFSETS[(start + i) % OFFSETS.length];
                const state = isDone(data, lesson.id) ? "done" : lesson.id === current && isUnlocked(data, lesson.id) ? "current" : "locked";
                return (
                  <Node
                    key={lesson.id}
                    lesson={lesson}
                    number={i + 1}
                    of={unit.lessons.length}
                    state={state}
                    stars={data.lessons[lesson.id]?.stars ?? 0}
                    offset={offset}
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
