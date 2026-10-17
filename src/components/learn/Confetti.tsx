import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

const COLORS = ["var(--primary)", "var(--star)", "#ff8fa3", "#7cc7ff", "#b79bff", "#7ad69a"];

// Fixed pseudo-random spread so it looks lively without Math.random in render.
const PIECES = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    left: `${r(1) * 100}%`,
    color: COLORS[i % COLORS.length],
    drift: `${(r(2) - 0.5) * 30}vw`,
    dur: `${2.2 + r(3) * 1.6}s`,
    delay: `${r(4) * 0.6}s`,
    round: r(5) > 0.6,
  };
});

export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={cn("confetti-piece", p.round && "rounded-full")}
          style={{ left: p.left, background: p.color, "--drift": p.drift, "--dur": p.dur, "--delay": p.delay } as CSSProperties}
        />
      ))}
    </div>
  );
}
