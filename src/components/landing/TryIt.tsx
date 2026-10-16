"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ImagePageView, type PagePin } from "@/components/reading/ImagePageView";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { MARK_CONFIG } from "@/lib/marks";
import { MARK_TYPES, type MarkType } from "@/lib/domain/types";
import { cellCenter, nearestCell, qaidaCells } from "@/lib/qaida/layout";
import type { PagePoint } from "@/lib/session/events";

const PAGE = 1;
// Roughly a round trip between India and Australia.
const DELAY_MS = 350;

function useDelayed<T>(value: T): T {
  const [delayed, setDelayed] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDelayed(value), DELAY_MS);
    return () => clearTimeout(t);
  }, [value]);
  return delayed;
}

function Device({ label, live, className, children }: { label: string; live: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-[1.75rem] border border-border bg-fg/90 p-2.5 shadow-xl", className)}>
      <div className="mb-2 flex items-center justify-between px-2 text-xs font-medium text-bg/80">
        <span>{label}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", live ? "bg-success" : "bg-bg/40")} />
          {live ? "Live" : "Waiting"}
        </span>
      </div>
      {children}
    </div>
  );
}

export function TryIt() {
  const first = qaidaCells(PAGE).find((c) => c.line === 2 && c.word === 1);
  const [childPos, setChildPos] = useState<PagePoint | null>(first ? cellCenter(first) : null);
  const [pins, setPins] = useState<PagePin[]>([]);
  const teacherPos = useDelayed(childPos);
  const childPins = useDelayed(pins);

  const teacherCell = teacherPos ? nearestCell(PAGE, teacherPos) : undefined;

  const mark = (markType: MarkType) => {
    if (!teacherCell) return;
    setPins((prev) => {
      const existing = prev.find((p) => nearestCell(PAGE, p.point)?.id === teacherCell.id);
      if (existing) return prev.map((p) => (p === existing ? { ...p, markType } : p));
      return [...prev, { id: teacherCell.id, point: cellCenter(teacherCell), markType, label: String(prev.length + 1) }];
    });
  };

  return (
    <div className="grid items-start gap-6 md:grid-cols-[1.25fr_1fr]">
      <Device label="Child’s tablet: tap a letter" live>
        <ImagePageView
          page={PAGE}
          position={childPos}
          pins={childPins}
          onPointTap={setChildPos}
          showCredit={false}
          className="rounded-2xl shadow-none ring-0"
        />
      </Device>

      <div className="space-y-4">
        <Device label="Teacher’s phone" live={!!teacherPos} className="mx-auto max-w-xs">
          <div className="aspect-[4/5] overflow-hidden rounded-xl bg-white">
            <ImagePageView
              page={PAGE}
              position={teacherPos}
              pins={pins}
              showCredit={false}
              className="rounded-none shadow-none ring-0"
            />
          </div>
        </Device>

        <p aria-live="polite" className="text-center text-sm text-muted">
          {teacherCell
            ? `The teacher sees line ${teacherCell.line}, box ${teacherCell.word}.`
            : "Tap a letter on the tablet."}
        </p>

        <fieldset className="rounded-2xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-medium">Now mark it, as the teacher</legend>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {MARK_TYPES.map((t) => {
              const cfg = MARK_CONFIG[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => mark(t)}
                  disabled={!teacherCell}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 bg-surface px-3 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
                  style={{ borderColor: cfg.colorVar, color: cfg.colorVar }}
                >
                  <Icon name={cfg.icon} size={16} strokeWidth={2.5} />
                  {cfg.shortLabel}
                </button>
              );
            })}
          </div>
          {pins.length > 0 && (
            <button
              type="button"
              onClick={() => setPins([])}
              className="mx-auto mt-3 flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm text-muted hover:bg-surface-2"
            >
              <Icon name="repeat" size={16} /> Start again
            </button>
          )}
        </fieldset>
      </div>
    </div>
  );
}
