"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { cn } from "@/lib/cn";
import { MARK_CONFIG } from "@/lib/marks";
import { QAIDA, qaidaImageSrc } from "@/lib/books";
import type { MarkType } from "@/lib/domain/types";
import type { PagePoint } from "@/lib/session/events";
import type { ReadingTheme } from "@/lib/prefs";
import { Icon } from "@/components/ui/Icon";

export type PagePin = { id: string; point: PagePoint; markType: MarkType; label?: string };

// Page scans are black on white, so themes are applied as image filters.
const THEME_FILTER: Record<ReadingTheme, string | undefined> = {
  paper: undefined,
  sepia: "sepia(0.45) brightness(0.97)",
  night: "invert(0.92) hue-rotate(180deg)",
};

const at = (p: PagePoint) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` });

export function QaidaCredit({ className }: { className?: string }) {
  const a = QAIDA.attribution;
  return (
    <p className={cn("text-xs text-muted", className)}>
      {a.title} ©{" "}
      <a href={a.url} className="underline" rel="noopener noreferrer" target="_blank">
        {a.author}
      </a>
      ,{" "}
      <a href={a.licenceUrl} className="underline" rel="noopener noreferrer license" target="_blank">
        {a.licence}
      </a>
      . {a.changes}.
    </p>
  );
}

export function ImagePageView({
  page,
  pins = [],
  position,
  selected,
  selectedPinId,
  onPointTap,
  onPinTap,
  readingTheme = "paper",
  className,
}: {
  page: number;
  pins?: PagePin[];
  /** Student's current point. */
  position?: PagePoint | null;
  /** Point the teacher is about to mark. */
  selected?: PagePoint | null;
  selectedPinId?: string | null;
  onPointTap?: (point: PagePoint) => void;
  onPinTap?: (id: string) => void;
  readingTheme?: ReadingTheme;
  className?: string;
}) {
  const handleTap = (e: MouseEvent<HTMLDivElement>) => {
    if (!onPointTap) return;
    const r = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    onPointTap({ x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) });
  };

  return (
    <figure
      aria-label={`Qaida page ${page}`}
      className={cn("overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border", className)}
    >
      <div
        className={cn("relative select-none", onPointTap && "cursor-crosshair")}
        onClick={handleTap}
        data-testid="qaida-page"
      >
        <Image
          src={qaidaImageSrc(page)}
          alt={`Noorani Qaida page ${page}`}
          width={QAIDA.width}
          height={QAIDA.height}
          unoptimized
          priority
          draggable={false}
          className="block h-auto w-full"
          style={{ filter: THEME_FILTER[readingTheme] }}
        />
        {position && (
          <span
            role="img"
            aria-label="Current position"
            className="pointer-events-none absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 ring-4 ring-primary"
            style={at(position)}
          />
        )}
        {selected && (
          <span
            aria-hidden
            className="pointer-events-none absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full outline-3 outline-dashed outline-focus"
            style={at(selected)}
          />
        )}
        {pins.map((pin) => {
          const cfg = MARK_CONFIG[pin.markType];
          const cls = cn(
            "absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] bg-white shadow",
            onPinTap ? "size-11" : "size-9",
            selectedPinId === pin.id && "outline-3 outline-offset-2 outline-dashed outline-focus",
          );
          const style = { ...at(pin.point), borderColor: cfg.colorVar, color: cfg.colorVar };
          const name = `Mark: ${cfg.label}${pin.label ? ` (#${pin.label})` : ""}`;
          const content = (
            <>
              <Icon name={cfg.icon} size={18} strokeWidth={2.5} />
              {pin.label && (
                <span
                  aria-hidden
                  className="absolute -top-2 -right-2 grid min-w-5 place-items-center rounded-full bg-fg px-1 text-[11px] leading-5 font-semibold text-bg"
                >
                  {pin.label}
                </span>
              )}
            </>
          );
          return onPinTap ? (
            <button
              key={pin.id}
              type="button"
              aria-label={name}
              className={cls}
              style={style}
              onClick={(e) => {
                e.stopPropagation();
                onPinTap(pin.id);
              }}
            >
              {content}
            </button>
          ) : (
            <span key={pin.id} role="img" aria-label={name} className={cls} style={style}>
              {content}
            </span>
          );
        })}
      </div>
      <figcaption className="border-t border-border bg-surface px-3 py-1.5">
        <QaidaCredit />
      </figcaption>
    </figure>
  );
}
