"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { usePrefs } from "@/lib/prefs";
import { speakLetter } from "@/lib/qaida/letters";
import { letter } from "@/lib/learn/curriculum";
import { again, seeded, type Exercise } from "@/lib/learn/exercises";
import type { LessonResult } from "@/lib/learn/progress";
import { buzz, playSfx, type Sfx } from "@/lib/learn/sfx";
import { Icon } from "@/components/ui/Icon";
import { ChoiceView, FindView, IntroView, MatchView, TipView, findIsRight, type Status } from "./ExerciseViews";
import { Mascot } from "./Mascot";

const PRAISE = ["Great job!", "Excellent!", "Well done!", "MashaAllah!", "Amazing!", "You got it!", "Brilliant!"];
const MAX_REPEATS = 2;

const graded = (e: Exercise) => e.kind === "choice" || e.kind === "find" || e.kind === "match";
const baseKey = (e: Exercise) => e.key.split("#")[0];

export function LessonPlayer({
  lessonId,
  title,
  exercises,
  onQuit,
  onFinish,
}: {
  lessonId: string;
  title: string;
  exercises: Exercise[];
  onQuit: () => void;
  onFinish: (r: LessonResult) => void;
}) {
  const { effects } = usePrefs();
  const [queue, setQueue] = useState(exercises);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("answering");
  const [selected, setSelected] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [praise, setPraise] = useState(PRAISE[0]);
  const [quitting, setQuitting] = useState(false);
  const [rng] = useState(() => seeded(Date.now()));
  const [started] = useState(() => Date.now());
  const answers = useRef<{ item: string; right: boolean }[]>([]);
  const firstTry = useRef(new Map<string, boolean>());
  const repeats = useRef(new Map<string, number>());

  const ex = queue[index];
  const sfx = useCallback((k: Sfx) => effects && playSfx(k), [effects]);

  const finish = useCallback(() => {
    const scored = [...firstTry.current.values()];
    onFinish({
      lessonId,
      correct: scored.filter(Boolean).length,
      total: scored.length,
      answers: answers.current,
      ms: Date.now() - started,
    });
  }, [lessonId, onFinish, started]);

  const settle = useCallback(
    (right: boolean, items: { item: string; right: boolean }[]) => {
      answers.current.push(...items);
      const k = baseKey(ex);
      if (!firstTry.current.has(k)) firstTry.current.set(k, right);
      setStatus(right ? "right" : "wrong");
      setPraise(PRAISE[Math.floor(rng() * PRAISE.length)]);
      setCombo((c) => (right ? c + 1 : 0));
      if (right) sfx("right");
      else {
        sfx("wrong");
        buzz();
        const n = repeats.current.get(k) ?? 0;
        if (n < MAX_REPEATS && ex.kind !== "match") {
          repeats.current.set(k, n + 1);
          setQueue((q) => [...q, again(ex, rng)]);
        }
      }
      // Say the right letter once answered, so the sound sticks.
      const sayId = ex.kind === "choice" ? ex.sayAfter : undefined;
      if (sayId) setTimeout(() => speakLetter(letter(sayId)), 350);
    },
    [ex, rng, sfx],
  );

  const check = useCallback(() => {
    if (!selected || status !== "answering") return;
    if (ex.kind === "choice") settle(selected === ex.answer, [{ item: ex.item, right: selected === ex.answer }]);
    else if (ex.kind === "find") {
      const right = findIsRight(ex, selected);
      settle(right, [{ item: ex.item, right }]);
    }
  }, [ex, selected, settle, status]);

  const next = useCallback(() => {
    if (index + 1 >= queue.length) {
      sfx("finish");
      finish();
      return;
    }
    setIndex(index + 1);
    setStatus("answering");
    setSelected(null);
  }, [finish, index, queue.length, sfx]);

  const select = (id: string) => {
    if (status !== "answering") return;
    setSelected(id);
  };

  const needsCheck = ex.kind === "choice" || ex.kind === "find";
  const canContinue = !graded(ex) || status !== "answering";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (quitting || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        if ((e.target as HTMLElement | null)?.tagName === "BUTTON") return;
        e.preventDefault();
        if (canContinue) next();
        else check();
        return;
      }
      const n = Number(e.key);
      if (ex.kind === "choice" && status === "answering" && n >= 1 && n <= ex.options.length) select(ex.options[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const progress = Math.round((index / queue.length) * 100);
  const correctOption = ex.kind === "choice" ? ex.options.find((o) => o.id === ex.answer) : undefined;

  return (
    <div
      data-no-say
      role="dialog"
      aria-modal="true"
      aria-label={`Lesson: ${title}`}
      className="fixed inset-0 z-40 flex flex-col bg-bg"
      data-testid="lesson"
    >
      <header className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 pt-4 pb-2">
        <button
          type="button"
          aria-label="Quit lesson"
          onClick={() => setQuitting(true)}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2"
        >
          <Icon name="x" size={26} />
        </button>
        <div
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-4 flex-1 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(4, progress)}%` }}>
            <div className="mx-2 mt-1 h-1 rounded-full bg-white/30" />
          </div>
        </div>
        <span
          aria-live="polite"
          className={cn(
            "inline-flex min-w-16 items-center justify-end gap-1 font-bold text-star transition-opacity",
            combo >= 3 ? "opacity-100" : "opacity-0",
          )}
        >
          <Icon name="spark" size={20} /> {combo >= 3 ? `${combo} in a row` : ""}
        </span>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col justify-center-safe overflow-y-auto px-4 py-6" key={ex.key}>
        {ex.kind === "intro" && <IntroView ex={ex} />}
        {ex.kind === "tip" && <TipView ex={ex} />}
        {ex.kind === "choice" && <ChoiceView ex={ex} status={status} selected={selected} onSelect={select} />}
        {ex.kind === "find" && <FindView ex={ex} status={status} selected={selected} onSelect={select} />}
        {ex.kind === "match" && (
          <MatchView
            ex={ex}
            onDone={(missed) =>
              settle(
                missed.length === 0,
                ex.letters.map((id) => ({ item: id, right: !missed.includes(id) })),
              )
            }
          />
        )}
      </main>

      <footer
        className={cn(
          "border-t-2",
          status === "right" ? "animate-slide-up border-success/30 bg-success-soft" : status === "wrong" ? "animate-slide-up border-danger/30 bg-danger-soft" : "border-border bg-bg",
        )}
      >
        <div className="mx-auto flex min-h-28 w-full max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div aria-live="assertive" className="flex min-w-0 items-center gap-3">
            {status === "right" && (
              <>
                <Mascot mood="cheer" size={56} className="hidden sm:block" />
                <p className="text-2xl font-bold text-success">{praise}</p>
              </>
            )}
            {status === "wrong" && (
              <>
                <Mascot mood="oops" size={56} className="hidden sm:block" />
                <div className="text-danger">
                  <p className="text-xl font-bold">{ex.kind === "match" ? "Nearly! Keep practising those." : "Not quite. The answer is:"}</p>
                  {correctOption && (
                    <p className="mt-0.5 text-lg">
                      {correctOption.arabic ? (
                        <span lang="ar" dir="rtl" className="font-arabic text-3xl">
                          {correctOption.text}
                        </span>
                      ) : (
                        <span className="font-semibold">{correctOption.text}</span>
                      )}
                      {ex.kind === "choice" && ex.explain && <span className="ml-2 text-base opacity-90">{ex.explain}</span>}
                    </p>
                  )}
                  {ex.kind === "find" && <p className="text-lg">It’s the box shown in green.</p>}
                </div>
              </>
            )}
          </div>
          {needsCheck && status === "answering" ? (
            <button
              type="button"
              onClick={check}
              disabled={!selected}
              style={{ "--edge": "color-mix(in srgb, var(--primary) 55%, black)" } as CSSProperties}
              className="ml-auto min-h-14 min-w-40 rounded-full bg-primary px-8 text-lg font-semibold text-primary-fg shadow-sm transition hover:brightness-110 disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
            >
              Check
            </button>
          ) : canContinue ? (
            <button
              type="button"
              onClick={next}
              autoFocus
              style={{ "--edge": `color-mix(in srgb, var(--${status === "wrong" ? "danger" : status === "right" ? "success" : "primary"}) 55%, black)` } as CSSProperties}
              className={cn(
                "ml-auto min-h-14 min-w-40 rounded-full px-8 text-lg font-semibold shadow-sm transition hover:brightness-110",
                status === "wrong" ? "bg-danger text-primary-fg" : status === "right" ? "bg-success text-primary-fg" : "bg-primary text-primary-fg",
              )}
            >
              Continue
            </button>
          ) : (
            <p className="ml-auto text-muted">Tap a letter, then its name</p>
          )}
        </div>
      </footer>

      {quitting && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={() => setQuitting(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="quit-title"
            onClick={(e) => e.stopPropagation()}
            className="animate-slide-up w-full max-w-md rounded-t-3xl bg-surface p-6 text-center shadow-xl sm:rounded-3xl"
          >
            <Mascot mood="oops" size={88} className="mx-auto" />
            <h2 id="quit-title" className="mt-2 text-2xl font-bold">
              Wait, don’t go yet!
            </h2>
            <p className="mt-1 text-muted">You’re doing well. If you stop now, this lesson won’t be saved.</p>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setQuitting(false)}
                style={{ "--edge": "color-mix(in srgb, var(--primary) 55%, black)" } as CSSProperties}
                className="min-h-14 rounded-full bg-primary text-lg font-semibold text-primary-fg"
              >
                Keep learning
              </button>
              <button type="button" onClick={onQuit} className="min-h-12 rounded-full font-semibold text-danger hover:bg-danger-soft">
                End lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
