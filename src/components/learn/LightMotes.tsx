import type { CSSProperties } from "react";

const COLORS = ["var(--star)", "#f5d58a", "#ffffff", "var(--primary)"];

// Fixed pseudo-random spread so it looks lively without Math.random in render.
const MOTES = Array.from({ length: 36 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const size = 4 + Math.round(r(5) * 8);
  return {
    left: `${r(1) * 100}%`,
    size,
    color: COLORS[i % COLORS.length],
    drift: `${(r(2) - 0.5) * 12}vw`,
    dur: `${3 + r(3) * 2.5}s`,
    delay: `${r(4) * 1.2}s`,
  };
});

/** Soft lights rising, for finishing a lesson. Hidden when the device asks for reduced motion. */
export function LightMotes() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="light-mote"
          style={
            {
              left: m.left,
              width: m.size,
              height: m.size,
              background: m.color,
              boxShadow: `0 0 ${m.size * 2}px ${m.color}`,
              "--drift": m.drift,
              "--dur": m.dur,
              "--delay": m.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
