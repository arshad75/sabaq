// Builds the exercises for one lesson. Pure and seeded, so it can be tested.
import type { LetterId } from "@/lib/qaida/letters";
import { letterFor } from "@/lib/qaida/letters";
import { qaidaCells } from "@/lib/qaida/layout";
import {
  DOTS,
  LOOK_ALIKES,
  VOWELS,
  formGlyph,
  formsOf,
  letter,
  lettersBefore,
  syllable,
  type Lesson,
  type LetterForm,
  type Vowel,
} from "./curriculum";

export type Option = { id: string; text: string; arabic?: boolean };

export type Prompt = {
  /** The instruction, e.g. "Tap the letter you hear". */
  title: string;
  /** Large Arabic shown as the question. */
  glyph?: string;
  /** English shown as the question. */
  text?: string;
  /** Letter whose name is played when the exercise opens and on the speaker button. */
  say?: LetterId;
};

export type Exercise =
  | { kind: "intro"; key: string; letter: LetterId }
  | { kind: "tip"; key: string; title: string; body: string; examples: { glyph: string; caption: string }[] }
  | {
      kind: "choice";
      key: string;
      /** What this tests, for spaced repetition: a letter id or a syllable like "ba+i". */
      item: string;
      prompt: Prompt;
      options: Option[];
      answer: string;
      /** Shown under the right answer when the child gets it wrong. */
      explain?: string;
      /** Letter to say once answered, to reinforce it. */
      sayAfter?: LetterId;
    }
  | { kind: "match"; key: string; letters: LetterId[] }
  | { kind: "find"; key: string; item: string; page: number; rows: number[]; answer: LetterId; by: "sound" | "glyph" };

export type Rng = () => number;

/** Small seeded PRNG (mulberry32). */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/** Up to n wrong answers from the pool, favouring look-alikes so the choice really tests something. */
export function distractors(answer: LetterId, pool: readonly LetterId[], n: number, rng: Rng): LetterId[] {
  const others = [...new Set(pool)].filter((id) => id !== answer);
  const family = LOOK_ALIKES.find((g) => g.includes(answer)) ?? [];
  const near = shuffle(others.filter((id) => family.includes(id)), rng);
  const far = shuffle(others.filter((id) => !family.includes(id)), rng);
  // At most two look-alikes, so there is always a clearly different letter too.
  return [...near.slice(0, 2), ...far, ...near.slice(2)].slice(0, n);
}

const glyphOption = (id: LetterId): Option => ({ id, text: letter(id).glyph, arabic: true });
const nameOption = (id: LetterId): Option => ({ id, text: letter(id).en });

let counter = 0;
const key = (k: string) => `${k}#${++counter}`;

export function hearPick(id: LetterId, pool: readonly LetterId[], rng: Rng): Exercise {
  const options = shuffle([id, ...distractors(id, pool, 3, rng)], rng).map(glyphOption);
  return { kind: "choice", key: key(`hear-${id}`), item: id, prompt: { title: "Tap the letter you hear", say: id }, options, answer: id, explain: letter(id).en };
}

export function glyphName(id: LetterId, pool: readonly LetterId[], rng: Rng): Exercise {
  const options = shuffle([id, ...distractors(id, pool, 3, rng)], rng).map(nameOption);
  return {
    kind: "choice",
    key: key(`name-${id}`),
    item: id,
    prompt: { title: "What is this letter called?", glyph: letter(id).glyph },
    options,
    answer: id,
    sayAfter: id,
  };
}

export function nameGlyph(id: LetterId, pool: readonly LetterId[], rng: Rng): Exercise {
  const options = shuffle([id, ...distractors(id, pool, 3, rng)], rng).map(glyphOption);
  return {
    kind: "choice",
    key: key(`pick-${id}`),
    item: id,
    prompt: { title: "Which one is this?", text: letter(id).en, say: id },
    options,
    answer: id,
    explain: letter(id).en,
  };
}

const DOT_LABEL = ["No dots", "1 dot", "2 dots", "3 dots"];

export function countDots(id: LetterId, rng: Rng): Exercise {
  const options = shuffle([0, 1, 2, 3], rng).map((n) => ({ id: String(n), text: DOT_LABEL[n] }));
  return {
    kind: "choice",
    key: key(`dots-${id}`),
    item: id,
    prompt: { title: "How many dots does it have?", glyph: letter(id).glyph },
    options,
    answer: String(DOTS[id]),
    explain: `${letter(id).en} has ${DOT_LABEL[DOTS[id]].toLowerCase()}`,
    sayAfter: id,
  };
}

const FORM_LABEL: Record<LetterForm, string> = { start: "at the start of a word", middle: "in the middle", end: "at the end" };

export function formPick(id: LetterId, form: LetterForm, pool: readonly LetterId[], rng: Rng): Exercise {
  const options = shuffle([id, ...distractors(id, pool, 3, rng)], rng).map(glyphOption);
  return {
    kind: "choice",
    key: key(`form-${id}-${form}`),
    item: id,
    prompt: { title: "Which letter is this?", glyph: formGlyph(id, form) },
    options,
    answer: id,
    explain: `${letter(id).en}, ${FORM_LABEL[form]}`,
    sayAfter: id,
  };
}

const VOWEL_LIST: Vowel[] = ["a", "i", "u"];

export function vowelRead(id: LetterId, v: Vowel, rng: Rng): Exercise {
  const s = syllable(id, v);
  const options = shuffle(VOWEL_LIST, rng).map((o) => ({ id: o, text: syllable(id, o).reads }));
  return {
    kind: "choice",
    key: key(`read-${id}-${v}`),
    item: `${id}+${v}`,
    prompt: { title: "How do you read this?", glyph: s.glyph },
    options,
    answer: v,
    explain: `${VOWELS[v].name}: ${VOWELS[v].where}`,
  };
}

export function vowelWrite(id: LetterId, v: Vowel, pool: readonly LetterId[], rng: Rng): Exercise {
  const s = syllable(id, v);
  // Same letter with the other marks, plus the same mark on a different letter.
  const other = distractors(id, pool, 1, rng)[0];
  const opts = [
    ...VOWEL_LIST.map((o) => ({ id: `${id}+${o}`, text: syllable(id, o).glyph, arabic: true })),
    ...(other ? [{ id: `${other}+${v}`, text: syllable(other, v).glyph, arabic: true }] : []),
  ];
  return {
    kind: "choice",
    key: key(`write-${id}-${v}`),
    item: `${id}+${v}`,
    prompt: { title: "Which one says this?", text: s.reads },
    options: shuffle(opts, rng),
    answer: `${id}+${v}`,
    explain: `${letter(id).en} with ${VOWELS[v].name.toLowerCase()}`,
  };
}

export function markName(v: Vowel, rng: Rng): Exercise {
  return {
    kind: "choice",
    key: key(`mark-${v}`),
    item: `mark+${v}`,
    prompt: { title: "What is the mark on this letter called?", glyph: syllable("ba", v).glyph },
    options: shuffle(VOWEL_LIST, rng).map((o) => ({ id: o, text: VOWELS[o].name })),
    answer: v,
    explain: VOWELS[v].where,
  };
}

function matchOf(letters: readonly LetterId[], rng: Rng): Exercise {
  return { kind: "match", key: key("match"), letters: shuffle(letters, rng).slice(0, 5) };
}

function findIn(lesson: Lesson, id: LetterId, by: "sound" | "glyph"): Exercise {
  return { kind: "find", key: key(`find-${id}`), item: id, page: lesson.page!, rows: lesson.rows!, answer: id, by };
}

/** Lowest-strength first, so revision spends time where it's needed. */
export type Strength = (item: string) => number;

function weakestFirst(letters: readonly LetterId[], strength: Strength | undefined, rng: Rng): LetterId[] {
  const s = shuffle(letters, rng);
  return strength ? s.sort((a, b) => strength(a) - strength(b)) : s;
}

function interleave(groups: Exercise[][], rng: Rng): Exercise[] {
  return shuffle(groups.flat(), rng);
}

export function buildLesson(lesson: Lesson, rng: Rng, strength?: Strength): Exercise[] {
  const before = lettersBefore(lesson.id);
  const pool = [...new Set([...lesson.letters, ...before])];
  const L = lesson.letters;

  switch (lesson.kind) {
    case "letters": {
      const intro = lesson.intro ?? L;
      const out: Exercise[] = [];
      for (const id of intro) {
        out.push({ kind: "intro", key: key(`intro-${id}`), letter: id });
        out.push(hearPick(id, pool, rng));
      }
      const practice = intro.flatMap((id) => [glyphName(id, pool, rng), nameGlyph(id, pool, rng)]);
      const recap = weakestFirst(before, strength, rng)
        .slice(0, 2)
        .map((id) => hearPick(id, pool, rng));
      out.push(...interleave([practice, recap], rng));
      out.push(matchOf([...intro, ...weakestFirst(before, strength, rng)].slice(0, 5), rng));
      return out;
    }
    case "review": {
      const focus = weakestFirst(L, strength, rng).slice(0, 10);
      const makers = [hearPick, glyphName, nameGlyph];
      const qs = shuffle(
        focus.map((id, i) => makers[i % makers.length](id, L, rng)),
        rng,
      );
      return [...qs.slice(0, 5), matchOf(focus.slice(0, 5), rng), ...qs.slice(5)];
    }
    case "dots": {
      const out: Exercise[] = [
        {
          kind: "tip",
          key: key("tip-dots"),
          title: "Count the dots",
          body: "These letters share a shape. Only the dots tell them apart, so look closely.",
          examples: L.map((id) => ({ glyph: letter(id).glyph, caption: letter(id).en })),
        },
      ];
      const qs = L.flatMap((id) => [countDots(id, rng), hearPick(id, L, rng), nameGlyph(id, L, rng)]);
      out.push(...shuffle(qs, rng).slice(0, 11));
      out.push(matchOf(L, rng));
      return out;
    }
    case "book": {
      const order = shuffle(L, rng).slice(0, 9);
      return order.map((id, i) => findIn(lesson, id, i % 2 === 0 ? "glyph" : "sound"));
    }
    case "shapes": {
      const joins = L.some((id) => formsOf(id).length > 1);
      const sample = L[0];
      const out: Exercise[] = [
        joins
          ? {
              kind: "tip",
              key: key("tip-shapes"),
              title: "Letters change shape",
              body: "When letters join up, they lose their tail or grow a little line. The dots stay the same.",
              examples: (["start", "middle", "end"] as LetterForm[]).map((f) => ({ glyph: formGlyph(sample, f), caption: `${letter(sample).en}, ${f}` })),
            }
          : {
              kind: "tip",
              key: key("tip-nonjoin"),
              title: "Letters that don’t join",
              body: "These letters never hold hands with the letter after them. They only join to the letter before.",
              examples: L.map((id) => ({ glyph: formGlyph(id, "end"), caption: letter(id).en })),
            },
      ];
      const qs = L.flatMap((id) => shuffle(formsOf(id), rng).slice(0, 2).map((f) => formPick(id, f, pool, rng)));
      out.push(...shuffle(qs, rng).slice(0, 11));
      return out;
    }
    case "vowels": {
      const out: Exercise[] = [];
      const first = lesson.id === "u7-1";
      if (first) {
        for (const v of VOWEL_LIST) {
          const s = syllable("ba", v);
          out.push({
            kind: "tip",
            key: key(`tip-${v}`),
            title: VOWELS[v].name,
            body: `${VOWELS[v].name} is ${VOWELS[v].where}. It gives the sound “${v}”.`,
            examples: [{ glyph: s.glyph, caption: s.reads }],
          });
        }
        out.push(...shuffle(VOWEL_LIST, rng).map((v) => markName(v, rng)));
      }
      const qs = L.flatMap((id) => {
        const [v1, v2] = shuffle(VOWEL_LIST, rng);
        return [vowelRead(id, v1, rng), vowelWrite(id, v2, pool, rng)];
      });
      out.push(...shuffle(qs, rng).slice(0, first ? 7 : 12));
      return out;
    }
  }
}

/** Letters a "find it" lesson can ask for: only boxes we know the letter of. */
export function findableCells(page: number, rows: number[]) {
  return qaidaCells(page).filter((c) => rows.includes(c.line) && letterFor(page, c));
}

/** A practice session from the learner's weakest letters. */
export function buildReview(learned: readonly LetterId[], strength: Strength, rng: Rng): Exercise[] {
  const weak = [...learned].sort((a, b) => strength(a) - strength(b)).slice(0, 8);
  if (weak.length < 2) return [];
  const makers = [hearPick, glyphName, nameGlyph];
  const qs = weak.map((id, i) => makers[i % makers.length](id, learned, rng));
  const extra = weak.slice(0, 4).map((id) => pick([hearPick, nameGlyph], rng)(id, learned, rng));
  return [...shuffle([...qs, ...extra], rng), matchOf(weak.slice(0, 5), rng)];
}

/** A fresh copy of an exercise with reshuffled options, for asking again after a mistake. */
export function again(ex: Exercise, rng: Rng): Exercise {
  if (ex.kind !== "choice") return { ...ex, key: key(ex.key.split("#")[0]) };
  return { ...ex, key: key(ex.key.split("#")[0]), options: shuffle(ex.options, rng) };
}
