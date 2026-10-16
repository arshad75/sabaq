"use client";

import Image from "next/image";
import { useState, type MouseEvent } from "react";
import { cn } from "@/lib/cn";
import { MARK_CONFIG } from "@/lib/marks";
import { QAIDA, qaidaImageSrc } from "@/lib/books";
import type { MarkType } from "@/lib/domain/types";
import type { PagePoint } from "@/lib/session/events";
import type { ReadingTheme } from "@/lib/prefs";
import { Icon } from "@/components/ui/Icon";
import { cellAt, cellCenter, nearestCell, qaidaCells, type QaidaCell } from "@/lib/qaida/layout";
import { letterFor, speakLetter, type LetterName } from "@/lib/qaida/letters";

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
  showCredit = true,
  speakLetters = false,
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
  /** Only turn off where the page already shows the Qaida credit (CC BY-SA). */
  showCredit?: boolean;
  /** Say the letter's name when a child taps a letter box (alphabet pages). */
  speakLetters?: boolean;
  className?: string;
}) {
  const cells = qaidaCells(page);
  const [spoken, setSpoken] = useState<{ cell: QaidaCell; letter: LetterName } | null>(null);
  const sayLetter = (c: QaidaCell) => {
    const letter = speakLetters ? letterFor(page, c) : undefined;
    if (!letter) return setSpoken(null);
    speakLetter(letter);
    setSpoken({ cell: c, letter });
  };
  const handleTap = (e: MouseEvent<HTMLDivElement>) => {
    // With detected word boxes, only the boxes are tappable; free taps are for pages without them.
    if (!onPointTap || cells.length > 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    onPointTap({ x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) });
  };

  const positionCell = position ? nearestCell(page, position) : undefined;
  const selectedCell = selected ? cellAt(page, selected) : undefined;
  const pinCell = new Map(pins.map((p) => [p.id, nearestCell(page, p.point)]));
  const pinsByCell = new Map<string, PagePin>();
  for (const p of pins) {
    const c = pinCell.get(p.id);
    if (c) pinsByCell.set(c.id, p);
  }

  return (
    <figure
      aria-label={`Qaida page ${page}`}
      className={cn("overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border", className)}
    >
      <div
        className={cn("relative select-none", onPointTap && cells.length === 0 && "cursor-crosshair")}
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
        {cells.map((c) => {
          const pin = pinsByCell.get(c.id);
          const cfg = pin ? MARK_CONFIG[pin.markType] : undefined;
          const isPosition = positionCell?.id === c.id;
          const isSelected = selectedCell?.id === c.id || (!!pin && selectedPinId === pin.id);
          const label = [
            `Line ${c.line}, word ${c.word}`,
            isPosition && "current position",
            cfg && `marked ${cfg.label}${pin?.label ? ` (#${pin.label})` : ""}`,
          ]
            .filter(Boolean)
            .join(", ");
          const cls = cn(
            "absolute rounded-md transition-colors",
            isPosition && "bg-primary/20 ring-3 ring-primary",
            cfg && "border-b-4",
            isSelected && "outline-3 outline-offset-1 outline-dashed outline-focus",
          );
          const style = {
            left: `${c.x0 * 100}%`,
            top: `${c.y0 * 100}%`,
            width: `${(c.x1 - c.x0) * 100}%`,
            height: `${(c.y1 - c.y0) * 100}%`,
            borderColor: cfg?.colorVar,
            backgroundColor: cfg && !isPosition ? `color-mix(in srgb, ${cfg.colorVar} 14%, transparent)` : undefined,
          };
          if (!onPointTap) {
            return isPosition || cfg ? (
              <span key={c.id} aria-label={label} className={cls} style={style} data-cell={c.id} />
            ) : null;
          }
          return (
            <button
              key={c.id}
              type="button"
              aria-label={label}
              aria-pressed={isPosition || isSelected}
              data-cell={c.id}
              className={cn(cls, "cursor-pointer hover:bg-primary/10 focus-visible:outline-3 focus-visible:outline-focus")}
              style={style}
              onClick={(e) => {
                e.stopPropagation();
                if (pin && onPinTap) onPinTap(pin.id);
                else onPointTap(cellCenter(c));
                sayLetter(c);
              }}
            />
          );
        })}
        {position && !positionCell && (
          <span
            role="img"
            aria-label="Current position"
            className="pointer-events-none absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 ring-4 ring-primary"
            style={at(position)}
          />
        )}
        {selected && !selectedCell && (
          <span
            aria-hidden
            className="pointer-events-none absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full outline-3 outline-dashed outline-focus"
            style={at(selected)}
          />
        )}
        {pins.map((pin) => {
          const cfg = MARK_CONFIG[pin.markType];
          const cell = pinCell.get(pin.id);
          // On a word box the badge sits on its top-right corner; otherwise at the tapped point.
          const anchor = cell ? { x: cell.x1, y: cell.y0 } : pin.point;
          const cls = cn(
            "absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] bg-white shadow",
            cell ? "size-8" : onPinTap ? "size-11" : "size-9",
            selectedPinId === pin.id && "outline-3 outline-offset-2 outline-dashed outline-focus",
          );
          const style = { ...at(anchor), borderColor: cfg.colorVar, color: cfg.colorVar };
          const name = `Mark: ${cfg.label}${pin.label ? ` (#${pin.label})` : ""}`;
          const content = (
            <>
              <Icon name={cfg.icon} size={cell ? 15 : 18} strokeWidth={2.5} />
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
          return onPinTap && !cell ? (
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
            // The word box itself is the button; the badge only shows the mark.
            <span key={pin.id} role="img" aria-label={name} className={cn(cls, "pointer-events-none")} style={style}>
              {content}
            </span>
          );
        })}
        {spoken && (
          <span
            key={spoken.cell.id}
            role="status"
            className="animate-pop-in pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-full bg-fg px-3 py-1 text-sm font-semibold whitespace-nowrap text-bg shadow-lg"
            style={at({ x: (spoken.cell.x0 + spoken.cell.x1) / 2, y: spoken.cell.y0 })}
          >
            <Icon name="speech" size={14} className="mr-1 inline" />
            {spoken.letter.en}
          </span>
        )}
      </div>
      {showCredit && (
        <figcaption className="border-t border-border bg-surface px-3 py-1.5">
          <QaidaCredit />
        </figcaption>
      )}
    </figure>
  );
}
