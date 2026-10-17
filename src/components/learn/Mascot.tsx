import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Mood = "happy" | "cheer" | "oops" | "think";

/** A friendly little book who keeps the child company. Decorative only. */
export function Mascot({ mood = "happy", size = 96, className }: { mood?: Mood; size?: number; className?: string }) {
  const eyes =
    mood === "cheer" ? (
      <>
        <path d="M40 56q6-7 12 0" />
        <path d="M68 56q6-7 12 0" />
      </>
    ) : (
      <>
        <circle cx="46" cy="56" r="7" fill="#fff" stroke="none" />
        <circle cx="74" cy="56" r="7" fill="#fff" stroke="none" />
        <circle cx={mood === "think" ? 48 : 47} cy={mood === "think" ? 53 : 57} r="3.5" fill="#1c1b19" stroke="none" />
        <circle cx={mood === "think" ? 76 : 75} cy={mood === "think" ? 53 : 57} r="3.5" fill="#1c1b19" stroke="none" />
      </>
    );
  const mouth =
    mood === "cheer" ? (
      <path d="M48 70q12 14 24 0z" fill="#7a2230" />
    ) : mood === "oops" ? (
      <ellipse cx="60" cy="74" rx="4" ry="5" fill="#7a2230" stroke="none" />
    ) : mood === "think" ? (
      <path d="M52 74h14" />
    ) : (
      <path d="M50 70q10 9 20 0" />
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden
      focusable="false"
      className={cn("shrink-0 overflow-visible", className)}
      fill="none"
      stroke="#1c1b19"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {mood === "cheer" && (
        <>
          <path d="M22 60L8 40" stroke="var(--primary)" strokeWidth="7" />
          <path d="M98 60l14-20" stroke="var(--primary)" strokeWidth="7" />
        </>
      )}
      <rect x="18" y="98" width="84" height="10" rx="4" fill="#fffdf8" />
      <rect x="20" y="24" width="80" height="80" rx="16" fill="var(--primary)" stroke="none" />
      <rect x="20" y="24" width="12" height="80" rx="6" fill="#000" opacity="0.15" stroke="none" />
      <path d="M30 32l6-10 6 10" stroke="var(--star)" strokeWidth="3" fill="var(--star)" />
      <circle cx="38" cy="68" r="5" fill="#ff9fb0" opacity="0.7" stroke="none" />
      <circle cx="82" cy="68" r="5" fill="#ff9fb0" opacity="0.7" stroke="none" />
      <g stroke="#fff">{eyes}</g>
      <g stroke="#fff">{mouth}</g>
    </svg>
  );
}

/** Mascot with a speech bubble. */
export function MascotSays({ mood, children, size = 88 }: { mood?: Mood; children: ReactNode; size?: number }) {
  return (
    <div className="flex items-end gap-3">
      <Mascot mood={mood} size={size} className="animate-float" />
      <div className="relative mb-6 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-lg font-semibold shadow-sm">
        <span aria-hidden className="absolute -left-2 bottom-4 size-4 rotate-45 border-b-2 border-l-2 border-border bg-surface" />
        {children}
      </div>
    </div>
  );
}
