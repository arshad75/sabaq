// Short lesson sound effects, synthesised with Web Audio so there are no audio files to licence.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, length: number, type: OscillatorType = "sine", gain = 0.18) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

export type Sfx = "right" | "wrong" | "tap" | "finish";

export function playSfx(kind: Sfx) {
  switch (kind) {
    case "right":
      tone(784, 0, 0.18, "triangle");
      tone(1175, 0.09, 0.28, "triangle");
      break;
    case "wrong":
      tone(220, 0, 0.22, "sine", 0.14);
      tone(196, 0.12, 0.3, "sine", 0.12);
      break;
    case "tap":
      tone(660, 0, 0.06, "sine", 0.06);
      break;
    case "finish":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, "triangle", 0.16));
      break;
  }
}

/** A short buzz on phones and tablets that support it. */
export function buzz(ms = 60) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(ms);
}
