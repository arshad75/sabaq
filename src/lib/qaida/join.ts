// Turns separately recorded letter names into one spoken phrase, the way a teacher spells a joined
// word in one breath ("Ba-Kha-Ta"): each name is cut where its voice falls away, and the next name
// starts while it fades. Pure, so it can be checked against the real recordings.

const FRAME_S = 0.01;
/** Kept before the onset so the first consonant isn't clipped. */
const LEAD_S = 0.02;
/** Kept after a name's voice drops, so it still ends like a word. */
const RELEASE_S = 0.05;
export const OVERLAP_S = 0.07;
export const FADE_IN_S = 0.015;
export const FADE_OUT_S = 0.1;

export type Clip = { samples: Float32Array; sampleRate: number };
export type Piece = { at: number; from: number; len: number };

function envelope({ samples, sampleRate }: Clip): number[] {
  const frame = Math.max(1, Math.round(sampleRate * FRAME_S));
  const out: number[] = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += samples[j] * samples[j];
    out.push(Math.sqrt(sum / frame));
  }
  return out;
}

/**
 * Where a name is actually said, in seconds. A name in the middle of a word ends where its voice
 * drops to a quarter of its peak; the last one keeps its natural fade.
 */
export function spokenRange(clip: Clip, last = false): [number, number] {
  const duration = clip.samples.length / clip.sampleRate;
  const env = envelope(clip);
  const peak = Math.max(0, ...env);
  if (peak === 0) return [0, duration];
  const onset = env.findIndex((v) => v > peak * 0.1);
  let end = env.length - 1;
  while (end > onset && env[end] <= peak * (last ? 0.05 : 0.25)) end--;
  const from = Math.max(0, onset * FRAME_S - LEAD_S);
  const to = Math.min(duration, (end + 1) * FRAME_S + (last ? FADE_IN_S : RELEASE_S));
  return [from, Math.max(to, from + OVERLAP_S + FADE_IN_S)];
}

/** When each name starts (seconds from the first), and which part of its clip to play. */
export function joinPlan(clips: Clip[]): Piece[] {
  let at = 0;
  return clips.map((clip, i) => {
    const [from, to] = spokenRange(clip, i === clips.length - 1);
    const piece = { at, from, len: to - from };
    at += piece.len - OVERLAP_S;
    return piece;
  });
}
