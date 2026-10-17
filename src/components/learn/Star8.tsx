import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// The eight-pointed star (khatam) from Islamic geometry: two squares, one turned 45°.
const R = 50;
const r = R * (Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8));
const POINTS = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8 - Math.PI / 2;
  const d = i % 2 === 0 ? R : r;
  return `${(50 + d * Math.cos(a)).toFixed(2)},${(50 + d * Math.sin(a)).toFixed(2)}`;
}).join(" ");

export function Star8({
  size = 64,
  fill,
  stroke = "none",
  glow,
  className,
  children,
}: {
  size?: number;
  fill: string;
  stroke?: string;
  glow?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg
        viewBox="-4 -4 108 108"
        width={size}
        height={size}
        aria-hidden
        focusable="false"
        className="absolute inset-0"
        style={glow ? { filter: `drop-shadow(0 0 10px color-mix(in srgb, ${fill} 70%, transparent))` } : undefined}
      >
        <polygon points={POINTS} fill={fill} stroke={stroke} strokeWidth={stroke === "none" ? 0 : 4} strokeLinejoin="round" />
        <polygon points={POINTS} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} transform="translate(50 50) scale(0.78) translate(-50 -50)" />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}
