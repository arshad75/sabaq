import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Badge } from "@/lib/rewards";
import { Icon, type IconName } from "./Icon";

export type TileColor = "mint" | "sky" | "peach" | "lilac" | "sun" | "rose";

const TILE_BG: Record<TileColor, string> = {
  mint: "bg-tile-mint",
  sky: "bg-tile-sky",
  peach: "bg-tile-peach",
  lilac: "bg-tile-lilac",
  sun: "bg-tile-sun",
  rose: "bg-tile-rose",
};

/** Big friendly quick-action tile. */
export function Tile({
  href,
  icon,
  title,
  subtitle,
  color,
  download,
}: {
  href: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  color: TileColor;
  download?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={download ? false : undefined}
      download={download || undefined}
      className={cn(
        "group flex min-h-28 flex-col justify-between gap-3 rounded-2xl p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md",
        TILE_BG[color],
      )}
    >
      <span className="grid size-11 place-items-center rounded-xl bg-surface/80 text-primary shadow-sm">
        <Icon name={icon} />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        {subtitle && <span className="block text-sm text-muted">{subtitle}</span>}
      </span>
    </Link>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>;
}

/** Stars, streak and other headline numbers as soft chips. */
export function RewardChips({ stars, streak, lessons }: { stars: number; streak: number; lessons: number }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Rewards">
      <li className="inline-flex items-center gap-1.5 rounded-full bg-tile-sun px-3 py-1.5 text-sm font-semibold">
        <Icon name="star" size={16} className="text-star" /> {stars} {stars === 1 ? "star" : "stars"}
      </li>
      <li className="inline-flex items-center gap-1.5 rounded-full bg-tile-peach px-3 py-1.5 text-sm font-semibold">
        <Icon name="flame" size={16} className="text-mark-repeat" /> {streak}-week streak
      </li>
      <li className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold">
        <Icon name="book" size={16} className="text-mark-slip" /> {lessons} {lessons === 1 ? "lesson" : "lessons"}
      </li>
    </ul>
  );
}

const BADGE_BG: Record<Badge["icon"], string> = {
  star: "bg-tile-sun",
  flame: "bg-tile-peach",
  check: "bg-tile-mint",
  book: "bg-tile-sky",
  target: "bg-tile-lilac",
};

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        {earned} of {badges.length} badges earned
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((b) => (
          <li
            key={b.id}
            className={cn(
              "flex flex-col items-center rounded-2xl p-4 text-center",
              b.earned ? BADGE_BG[b.icon] : "bg-surface-2 opacity-60",
            )}
          >
            <span
              className={cn(
                "mb-2 grid size-12 place-items-center rounded-full",
                b.earned ? "bg-surface text-star shadow-sm" : "bg-surface text-muted",
              )}
            >
              <Icon name={b.earned ? b.icon : "lock"} size={22} />
            </span>
            <span className="text-sm font-semibold">{b.title}</span>
            <span className="text-xs text-muted">{b.earned ? b.description : `Locked: ${b.description.toLowerCase()}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
