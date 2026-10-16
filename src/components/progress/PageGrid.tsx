"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { STATUS_CONFIG } from "@/lib/marks";
import { PAGE_STATUSES, type PageProgress, type PageStatus } from "@/lib/domain/types";
import { StatusBadge, StatusLegend, statusStyle } from "@/components/ui/Indicators";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";

const PAGES_PER_ROW = 20;

export function PageGrid({
  pageCount,
  progress,
  selected,
  onSelect,
  label,
}: {
  pageCount: number;
  progress: PageProgress[];
  selected?: number | null;
  onSelect?: (page: number) => void;
  label: string;
}) {
  const byPage = useMemo(() => new Map(progress.map((p) => [p.page, p])), [progress]);
  const rows = Math.ceil(pageCount / PAGES_PER_ROW);

  return (
    <div>
      <div
        role={onSelect ? "group" : "img"}
        aria-label={label}
        className="space-y-[3px] overflow-x-auto pb-1"
      >
        {Array.from({ length: rows }, (_, r) => {
          const from = r * PAGES_PER_ROW + 1;
          const to = Math.min(pageCount, from + PAGES_PER_ROW - 1);
          return (
            <div key={r} className="flex items-center gap-2">
              <span aria-hidden className="w-14 shrink-0 text-right text-[11px] text-muted tabular-nums">
                {from}–{to}
              </span>
              <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${PAGES_PER_ROW}, minmax(10px, 1fr))` }}>
                {Array.from({ length: to - from + 1 }, (_, i) => {
                  const page = from + i;
                  const p = byPage.get(page);
                  const status: PageStatus = p?.status ?? "not_started";
                  const common = cn(
                    "relative aspect-square rounded-[3px]",
                    selected === page && "outline-2 outline-offset-1 outline-fg",
                  );
                  const title = `Page ${page}: ${STATUS_CONFIG[status].label}${p?.source === "teacher_override" ? " (set by teacher)" : ""}`;
                  return onSelect ? (
                    <button
                      key={page}
                      type="button"
                      title={title}
                      aria-label={title}
                      aria-pressed={selected === page}
                      className={common}
                      style={statusStyle(status)}
                      onClick={() => onSelect(page)}
                    >
                      {p?.source === "teacher_override" && <OverrideDot />}
                    </button>
                  ) : (
                    <span key={page} title={title} className={common} style={statusStyle(status)}>
                      {p?.source === "teacher_override" && <OverrideDot />}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <StatusLegend />
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <span aria-hidden className="relative inline-block size-3.5 rounded-[3px] bg-surface-2">
            <OverrideDot />
          </span>
          Set by teacher
        </span>
      </div>
    </div>
  );
}

function OverrideDot() {
  return <span aria-hidden className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-fg" />;
}

/** Teacher-only: inspect a page and override its status. Changes are local in the prototype. */
export function ProgressExplorer({ pageCount, progress: initial }: { pageCount: number; progress: PageProgress[] }) {
  const [progress, setProgress] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState("");
  const [status, setStatus] = useState<PageStatus>("solid");
  const [saved, setSaved] = useState<string | null>(null);
  const current = selected ? progress.find((p) => p.page === selected) : undefined;

  const select = (page: number) => {
    setSelected(page);
    setPageInput(String(page));
    setStatus(progress.find((p) => p.page === page)?.status ?? "not_started");
    setSaved(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <PageGrid
        pageCount={pageCount}
        progress={progress}
        selected={selected}
        onSelect={select}
        label="Page progress grid. Choose a page to see or change its status."
      />
      <form
        className="space-y-4 rounded-2xl bg-surface-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const page = Number(pageInput);
          if (!Number.isInteger(page) || page < 1 || page > pageCount) return;
          setProgress((list) => [
            ...list.filter((p) => p.page !== page),
            { studentId: "", page, status, source: "teacher_override", updatedAt: new Date().toISOString() },
          ]);
          setSelected(page);
          setSaved(`Page ${page} set to ${STATUS_CONFIG[status].label}.`);
        }}
      >
        <h3 className="font-semibold">Set page status</h3>
        <Field id="override-page" label="Page">
          <TextInput
            id="override-page"
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => {
              setPageInput(e.target.value);
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= pageCount) select(n);
            }}
            placeholder={`1–${pageCount}`}
          />
        </Field>
        {selected && (
          <p className="text-sm">
            Now: <StatusBadge status={current?.status ?? "not_started"} />{" "}
            <span className="text-muted">
              {current?.source === "teacher_override" ? "set by you" : current ? "from marks" : ""}
            </span>
          </p>
        )}
        <Field id="override-status" label="New status">
          <Select id="override-status" value={status} onChange={(e) => setStatus(e.target.value as PageStatus)}>
            {PAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="w-full" disabled={!pageInput}>
          Save override
        </Button>
        {saved && <Banner tone="success">{saved}</Banner>}
        <p className="text-xs text-muted">Your setting always wins over the status worked out from marks.</p>
      </form>
    </div>
  );
}
