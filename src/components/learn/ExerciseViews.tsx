"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { QAIDA, qaidaImageSrc } from "@/lib/books";
import { letterFor, speakLetter, type LetterId } from "@/lib/qaida/letters";
import { letter } from "@/lib/learn/curriculum";
import { findableCells, seeded, shuffle, type Exercise, type Prompt } from "@/lib/learn/exercises";
import { QaidaCredit } from "@/components/reading/ImagePageView";
import { Icon } from "@/components/ui/Icon";

export type Status = "answering" | "right" | "wrong";
type Of<K extends Exercise["kind"]> = Extract<Exercise, { kind: K }>;

const say = (id: LetterId) => speakLetter(letter(id));

const edge = (c: string) => ({ "--edge": c }) as CSSProperties;

function Arabic({ children, className }: { children: string; className?: string }) {
  return (
    <span lang="ar" dir="rtl" className={cn("font-arabic leading-[1.35]", className)}>
      {children}
    </span>
  );
}

export function SayButton({ id, size = "md", label = "Play the sound again" }: { id: LetterId; size?: "md" | "xl"; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => say(id)}
      style={edge("color-mix(in srgb, var(--primary) 55%, black)")}
      className={cn(
        "press-3d grid shrink-0 place-items-center rounded-2xl bg-primary text-primary-fg hover:brightness-110",
        size === "xl" ? "size-28 rounded-3xl" : "size-14",
      )}
    >
      <Icon name="volume" size={size === "xl" ? 52 : 28} />
    </button>
  );
}

function PromptView({ prompt, exKey }: { prompt: Prompt; exKey: string }) {
  useEffect(() => {
    if (prompt.say) say(prompt.say);
  }, [prompt.say, exKey]);
  if (prompt.glyph)
    return (
      <div className="flex items-center justify-center gap-4">
        <div className="grid min-w-40 place-items-center rounded-3xl border-2 border-border bg-surface px-10 py-4 shadow-sm">
          <Arabic className="text-8xl sm:text-9xl">{prompt.glyph}</Arabic>
        </div>
        {prompt.say && <SayButton id={prompt.say} />}
      </div>
    );
  if (prompt.text)
    return (
      <div className="flex items-center justify-center gap-4">
        <p className="rounded-3xl border-2 border-border bg-surface px-8 py-5 text-4xl font-bold shadow-sm sm:text-5xl">{prompt.text}</p>
        {prompt.say && <SayButton id={prompt.say} />}
      </div>
    );
  return prompt.say ? (
    <div className="flex justify-center">
      <SayButton id={prompt.say} size="xl" />
    </div>
  ) : null;
}

function optionClass(state: "idle" | "picked" | "right" | "wrong" | "dim") {
  return {
    idle: "border-border bg-surface hover:bg-surface-2",
    picked: "border-primary bg-primary-soft text-primary",
    right: "border-success bg-success-soft text-success",
    wrong: "border-danger bg-danger-soft text-danger animate-shake",
    dim: "border-border bg-surface opacity-50",
  }[state];
}

const optionEdge = {
  idle: "var(--border)",
  picked: "var(--primary)",
  right: "var(--success)",
  wrong: "var(--danger)",
  dim: "var(--border)",
};

export function ChoiceView({
  ex,
  status,
  selected,
  onSelect,
}: {
  ex: Of<"choice">;
  status: Status;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const arabic = ex.options.every((o) => o.arabic);
  return (
    <div className="space-y-8" data-answer={ex.answer}>
      <h2 className="text-2xl font-bold sm:text-3xl">{ex.prompt.title}</h2>
      <PromptView prompt={ex.prompt} exKey={ex.key} />
      <div
        role="group"
        aria-label="Answers"
        className={cn("grid gap-3", arabic ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2")}
      >
        {ex.options.map((o, i) => {
          const state =
            status === "answering"
              ? selected === o.id
                ? "picked"
                : "idle"
              : o.id === ex.answer
                ? "right"
                : o.id === selected
                  ? "wrong"
                  : "dim";
          return (
            <button
              key={o.id}
              type="button"
              data-option={o.id}
              aria-pressed={selected === o.id}
              aria-keyshortcuts={String(i + 1)}
              disabled={status !== "answering"}
              onClick={() => onSelect(o.id)}
              style={edge(optionEdge[state])}
              className={cn(
                "press-3d relative flex items-center justify-center rounded-2xl border-2 px-4 font-semibold disabled:cursor-default",
                arabic ? "min-h-28" : "min-h-16 text-xl",
                optionClass(state),
              )}
            >
              <span aria-hidden className="absolute top-2 left-2.5 hidden text-xs font-medium text-muted md:block">
                {i + 1}
              </span>
              {o.arabic ? <Arabic className="text-6xl">{o.text}</Arabic> : o.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function IntroView({ ex }: { ex: Of<"intro"> }) {
  const l = letter(ex.letter);
  useEffect(() => {
    say(ex.letter);
  }, [ex.letter, ex.key]);
  return (
    <div className="space-y-6 text-center">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-tile-lilac px-3 py-1 text-sm font-bold tracking-wide uppercase">
        <Icon name="star" size={16} className="text-star" /> New letter
      </p>
      <button
        type="button"
        onClick={() => say(ex.letter)}
        aria-label={`Hear ${l.en}`}
        style={edge("var(--border)")}
        className="press-3d mx-auto grid size-56 place-items-center rounded-[2.5rem] border-2 border-border bg-surface hover:bg-surface-2 sm:size-64"
      >
        <Arabic className="text-[9rem] sm:text-[10rem]">{l.glyph}</Arabic>
      </button>
      <div>
        <p className="text-4xl font-bold">{l.en}</p>
        <p className="mt-2 flex items-center justify-center gap-2 text-muted">
          <Icon name="volume" size={18} /> Tap the letter to hear its name again
        </p>
      </div>
    </div>
  );
}

export function TipView({ ex }: { ex: Of<"tip"> }) {
  return (
    <div className="space-y-6 text-center">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-tile-sky px-3 py-1 text-sm font-bold tracking-wide uppercase">
        <Icon name="info" size={16} /> Tip
      </p>
      <h2 className="text-3xl font-bold">{ex.title}</h2>
      <p className="mx-auto max-w-xl text-lg text-muted">{ex.body}</p>
      <ul className="flex flex-wrap justify-center gap-3">
        {ex.examples.map((e) => (
          <li key={e.caption + e.glyph} className="min-w-24 rounded-2xl border-2 border-border bg-surface px-4 pt-2 pb-3">
            <Arabic className="block text-6xl">{e.glyph}</Arabic>
            <span className="text-sm font-semibold text-muted">{e.caption}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MatchView({ ex, onDone }: { ex: Of<"match">; onDone: (missed: LetterId[]) => void }) {
  const [glyphs, names] = useMemo(() => {
    const rng = seeded(ex.key.length * 97 + ex.letters.length);
    return [shuffle(ex.letters, rng), shuffle(ex.letters, rng)];
  }, [ex.key, ex.letters]);
  const [pick, setPick] = useState<{ side: "g" | "n"; id: LetterId } | null>(null);
  const [matched, setMatched] = useState<LetterId[]>([]);
  const [missed, setMissed] = useState<LetterId[]>([]);
  const [flash, setFlash] = useState<string[]>([]);

  const choose = (side: "g" | "n", id: LetterId) => {
    if (side === "g") say(id);
    if (!pick || pick.side === side) return setPick({ side, id });
    if (pick.id === id) {
      const next = [...matched, id];
      setMatched(next);
      setPick(null);
      if (next.length === ex.letters.length) onDone(missed);
    } else {
      setMissed((m) => [...new Set([...m, pick.id, id])]);
      setFlash([`${pick.side}:${pick.id}`, `${side}:${id}`]);
      setPick(null);
      setTimeout(() => setFlash([]), 500);
    }
  };

  const cell = (side: "g" | "n", id: LetterId) => {
    const done = matched.includes(id);
    const picked = pick?.side === side && pick.id === id;
    const bad = flash.includes(`${side}:${id}`);
    const state = done ? "right" : bad ? "wrong" : picked ? "picked" : "idle";
    return (
      <button
        key={side + id}
        type="button"
        disabled={done}
        aria-pressed={picked}
        data-match={`${side}:${id}`}
        onClick={() => choose(side, id)}
        style={edge(optionEdge[state])}
        className={cn(
          "press-3d flex min-h-16 w-full items-center justify-center rounded-2xl border-2 px-3 font-semibold transition-opacity",
          optionClass(state),
          done && "opacity-40",
        )}
      >
        {side === "g" ? <Arabic className="text-5xl">{letter(id).glyph}</Arabic> : <span className="text-xl">{letter(id).en}</span>}
      </button>
    );
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold sm:text-3xl">Match the pairs</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-8">
        <div className="space-y-3" role="group" aria-label="Letters">
          {glyphs.map((id) => cell("g", id))}
        </div>
        <div className="space-y-3" role="group" aria-label="Names">
          {names.map((id) => cell("n", id))}
        </div>
      </div>
    </div>
  );
}

/** Part of a Qaida page, cropped to the rows the lesson uses, with tappable letter boxes. */
function QaidaCrop({
  page,
  rows,
  selected,
  status,
  answer,
  onSelect,
}: {
  page: number;
  rows: number[];
  selected: string | null;
  status: Status;
  answer: LetterId;
  onSelect: (cellId: string) => void;
}) {
  const cells = findableCells(page, rows);
  const y0 = Math.max(0, Math.min(...cells.map((c) => c.y0)) - 0.012);
  const y1 = Math.min(1, Math.max(...cells.map((c) => c.y1)) + 0.012);
  const h = y1 - y0;
  return (
    <figure className="overflow-hidden rounded-2xl bg-white shadow-sm ring-2 ring-border">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${QAIDA.width} / ${QAIDA.height * h}` }}>
        <Image
          src={qaidaImageSrc(page)}
          alt={`Part of Noorani Qaida page ${page}`}
          width={QAIDA.width}
          height={QAIDA.height}
          unoptimized
          priority
          draggable={false}
          className="absolute left-0 h-auto w-full max-w-none select-none"
          style={{ top: `${(-y0 / h) * 100}%` }}
        />
        {cells.map((c, i) => {
          const isAnswer = letterFor(page, c)?.id === answer;
          const state =
            status === "answering"
              ? selected === c.id
                ? "picked"
                : "idle"
              : isAnswer
                ? "right"
                : selected === c.id
                  ? "wrong"
                  : "idle";
          return (
            <button
              key={c.id}
              type="button"
              aria-label={`Box ${i + 1}`}
              aria-pressed={selected === c.id}
              data-letter={letterFor(page, c)?.id}
              disabled={status !== "answering"}
              onClick={() => onSelect(c.id)}
              className={cn(
                "absolute rounded-lg transition-colors",
                state === "idle" && "hover:bg-primary/10",
                state === "picked" && "bg-primary/20 ring-4 ring-primary",
                state === "right" && "bg-success/20 ring-4 ring-success",
                state === "wrong" && "animate-shake bg-danger/20 ring-4 ring-danger",
              )}
              style={{
                left: `${(c.x0 - 0.01) * 100}%`,
                width: `${(c.x1 - c.x0 + 0.02) * 100}%`,
                top: `${((c.y0 - y0) / h) * 100}%`,
                height: `${((c.y1 - c.y0) / h) * 100}%`,
              }}
            />
          );
        })}
      </div>
      <figcaption className="border-t border-border bg-surface px-3 py-1.5">
        <QaidaCredit />
      </figcaption>
    </figure>
  );
}

export function FindView({
  ex,
  status,
  selected,
  onSelect,
}: {
  ex: Of<"find">;
  status: Status;
  selected: string | null;
  onSelect: (cellId: string) => void;
}) {
  const l = letter(ex.answer);
  useEffect(() => {
    if (ex.by === "sound") say(ex.answer);
  }, [ex.by, ex.answer, ex.key]);
  return (
    <div className="space-y-5" data-answer={ex.answer}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold sm:text-3xl">
          {ex.by === "sound" ? "Find the letter you hear" : "Find this letter in your Qaida"}
        </h2>
        {ex.by === "sound" ? (
          <SayButton id={ex.answer} />
        ) : (
          <span className="grid min-w-20 place-items-center rounded-2xl border-2 border-border bg-surface px-4">
            <Arabic className="text-6xl">{l.glyph}</Arabic>
          </span>
        )}
      </div>
      <QaidaCrop page={ex.page} rows={ex.rows} selected={selected} status={status} answer={ex.answer} onSelect={onSelect} />
    </div>
  );
}

/** Whether a tapped Qaida box holds the asked-for letter. */
export function findIsRight(ex: Of<"find">, cellId: string): boolean {
  return findableCells(ex.page, ex.rows).some((c) => c.id === cellId && letterFor(ex.page, c)?.id === ex.answer);
}
