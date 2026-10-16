"use client";

import { Suspense, useRef, useState, type ReactNode } from "react";
import { getSource, getSurahStartPage } from "@/lib/quran";
import { bookPageCount, clampBookPage } from "@/lib/books";
import type { Book } from "@/lib/domain/types";
import { usePage } from "@/lib/quran/use-page";
import type { QuranWord } from "@/lib/quran/types";
import { ReadingView, type ReadingViewProps } from "@/components/reading/ReadingView";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/States";
import { Select, TextInput } from "@/components/ui/Form";
import { cn } from "@/lib/cn";

export function PageSurface(props: Omit<ReadingViewProps, "page" | "isPlaceholder"> & { pageNumber: number }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LoadedPage {...props} />
    </Suspense>
  );
}

function LoadedPage({ pageNumber, ...rest }: Omit<ReadingViewProps, "page" | "isPlaceholder"> & { pageNumber: number }) {
  const page = usePage(pageNumber);
  return <ReadingView page={page} isPlaceholder={getSource().info.isPlaceholder} {...rest} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-4 rounded-2xl bg-reading-bg p-6 ring-1 ring-border">
      {Array.from({ length: 15 }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

/** Swipe and arrow-key page turning. RTL book: next page is to the left. */
export function PageTurner({
  onNext,
  onPrev,
  children,
}: {
  onNext: () => void;
  onPrev: () => void;
  children: ReactNode;
}) {
  const [startX, setStartX] = useState<number | null>(null);
  const swiped = useRef(false);
  return (
    <div
      className="touch-pan-y"
      onPointerDown={(e) => {
        swiped.current = false;
        if (e.pointerType !== "mouse") setStartX(e.clientX);
      }}
      onPointerUp={(e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        setStartX(null);
        if (Math.abs(dx) > 70) swiped.current = true;
        if (dx > 70) onNext();
        else if (dx < -70) onPrev();
      }}
      onClickCapture={(e) => {
        // A swipe ends with a click; don't let it also mark a word or spot.
        if (swiped.current) {
          e.stopPropagation();
          swiped.current = false;
        }
      }}
      onPointerCancel={() => setStartX(null)}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("input, textarea, select")) return;
        if (e.key === "ArrowLeft") onNext();
        if (e.key === "ArrowRight") onPrev();
      }}
    >
      {children}
    </div>
  );
}

export function PageNavBar({
  book = "quran",
  page,
  onChange,
  large = false,
  extra,
}: {
  book?: Book;
  page: number;
  onChange: (page: number) => void;
  large?: boolean;
  extra?: ReactNode;
}) {
  const count = bookPageCount(book);
  const clampPage = (p: number) => clampBookPage(book, p);
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* RTL reading: "next" sits on the left like a printed mushaf. */}
      <Button
        variant="secondary"
        size={large ? "lg" : "md"}
        icon="chevronLeft"
        aria-label="Next page"
        onClick={() => onChange(clampPage(page + 1))}
        disabled={page >= count}
      >
        <span>
          Next<span className="hidden sm:inline">&nbsp;page</span>
        </span>
      </Button>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium whitespace-nowrap tabular-nums" aria-live="polite">
          Page {page} <span className="text-muted">of {count}</span>
        </span>
        {extra}
      </div>
      <Button
        variant="secondary"
        size={large ? "lg" : "md"}
        iconEnd="chevronRight"
        aria-label="Previous page"
        onClick={() => onChange(clampPage(page - 1))}
        disabled={page <= 1}
      >
        <span>
          Prev<span className="hidden sm:inline">ious</span>
        </span>
      </Button>
    </div>
  );
}

export function JumpTo({ book = "quran", onJump }: { book?: Book; onJump: (page: number) => void }) {
  const [open, setOpen] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const source = getSource();
  const count = bookPageCount(book);
  return (
    <div className="relative">
      <IconButton
        icon="target"
        label={book === "quran" ? "Jump to page or surah" : "Jump to page"}
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      />
      {open && (
        <div className="absolute bottom-full left-1/2 z-40 mb-2 w-72 -translate-x-1/2 space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-lg">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(pageInput);
              if (Number.isFinite(n) && n >= 1) {
                onJump(clampBookPage(book, n));
                setOpen(false);
              }
            }}
          >
            <label className="flex-1 text-sm font-medium">
              Page
              <TextInput
                inputMode="numeric"
                pattern="[0-9]*"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder={`1–${count}`}
              />
            </label>
            <Button type="submit">Go</Button>
          </form>
          {book === "quran" && (
            <label className="block text-sm font-medium">
              Surah
              <Select
                defaultValue=""
                onChange={async (e) => {
                  const s = Number(e.target.value);
                  if (!s) return;
                  onJump(await getSurahStartPage(s));
                  setOpen(false);
                }}
              >
                <option value="" disabled>
                  Choose a surah
                </option>
                {Array.from({ length: source.surahCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Surah {i + 1}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export function wordRef(word: QuranWord) {
  return { page: word.page, surah: word.surah, ayah: word.ayah, wordIndex: word.wordIndex };
}

export function FullScreenMessage({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <div
        role={tone === "danger" ? "alert" : "status"}
        className={cn(
          "w-full max-w-md rounded-2xl border p-8 text-center",
          tone === "danger" ? "border-danger/30 bg-danger-soft" : "border-border bg-surface",
        )}
      >
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="mt-3 space-y-4 text-muted">{children}</div>
      </div>
    </main>
  );
}
