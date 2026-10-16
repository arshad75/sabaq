"use client";

import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { MARK_CONFIG } from "@/lib/marks";
import type { MarkType } from "@/lib/domain/types";
import type { QuranPage, QuranWord } from "@/lib/quran/types";
import type { ReadingTheme } from "@/lib/prefs";
import { Icon } from "@/components/ui/Icon";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

export type ReadingViewProps = {
  page: QuranPage;
  /** Keyed by word key (`surah:ayah:wordIndex`). */
  marks?: Map<string, { markType: MarkType }>;
  /** Student's current word. */
  positionKey?: string | null;
  /** Word the teacher is about to mark. */
  selectedKey?: string | null;
  onWordTap?: (word: QuranWord) => void;
  readingTheme?: ReadingTheme;
  isPlaceholder?: boolean;
  className?: string;
};

export function ReadingView({
  page,
  marks,
  positionKey,
  selectedKey,
  onWordTap,
  readingTheme = "paper",
  isPlaceholder = false,
  className,
}: ReadingViewProps) {
  return (
    <article
      data-reading-theme={readingTheme}
      data-no-say
      aria-label={`Page ${page.page}`}
      className={cn("@container rounded-2xl bg-reading-bg text-reading-fg shadow-sm ring-1 ring-border", className)}
    >
      {isPlaceholder && (
        <p className="border-b border-border/60 px-4 py-1.5 text-center text-xs text-muted">
          Layout placeholder, not Quran text. Real text is added after the source licence is approved.
        </p>
      )}
      <div
        dir="rtl"
        lang="ar"
        className="px-[4cqi] py-[3cqi] font-arabic leading-[2.4]"
        style={{ fontSize: "calc(clamp(1.15rem, 4.3cqi, 2.6rem) * var(--reading-scale, 1))" }}
      >
        {page.lines.map((line) => (
          <Fragment key={line.lineNumber}>
            {line.surahStart && (
              <div
                dir="ltr"
                className="my-[0.3em] rounded-lg border-2 border-double border-current/30 py-[0.15em] text-center font-sans text-[0.55em] font-semibold"
              >
                Surah {line.surahStart}
              </div>
            )}
            <div className="flex flex-wrap items-baseline justify-between gap-x-[0.2em]" data-line={line.lineNumber}>
              {line.words.map((word) => {
                const ayahEnd = line.ayahEnds.find((e) => e.afterWordKey === word.key);
                return (
                  <Fragment key={word.key}>
                    <WordToken
                      word={word}
                      mark={marks?.get(word.key)?.markType}
                      isPosition={positionKey === word.key}
                      isSelected={selectedKey === word.key}
                      onTap={onWordTap}
                    />
                    {ayahEnd && (
                      <span
                        role="img"
                        aria-label={`End of ayah ${ayahEnd.ayah}`}
                        className="inline-grid size-[1.5em] place-items-center rounded-full border border-current/40 text-[0.5em] leading-none"
                      >
                        {toArabicDigits(ayahEnd.ayah)}
                      </span>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </article>
  );
}

function WordToken({
  word,
  mark,
  isPosition,
  isSelected,
  onTap,
}: {
  word: QuranWord;
  mark?: MarkType;
  isPosition: boolean;
  isSelected: boolean;
  onTap?: (word: QuranWord) => void;
}) {
  const cfg = mark ? MARK_CONFIG[mark] : undefined;
  const label = [
    word.text,
    `ayah ${word.ayah}, word ${word.wordIndex}`,
    cfg && `marked ${cfg.label}`,
    isPosition && "current position",
  ]
    .filter(Boolean)
    .join(", ");

  const cls = cn(
    "relative inline-block rounded-[0.25em] px-[0.12em] transition-colors",
    onTap && "cursor-pointer hover:bg-current/5",
    isPosition && "bg-primary-soft ring-2 ring-primary",
    isSelected && "outline-3 outline-offset-2 outline-dashed outline-focus",
  );
  const style = cfg
    ? { textDecorationLine: "underline", textDecorationColor: cfg.colorVar, textDecorationThickness: "0.09em", textUnderlineOffset: "0.35em" }
    : undefined;

  const content = (
    <>
      {word.text}
      {cfg && (
        <span
          aria-hidden
          className="absolute -top-[0.55em] left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-reading-bg p-[0.08em]"
          style={{ color: cfg.colorVar }}
        >
          <Icon name={cfg.icon} size={16} strokeWidth={2.5} />
        </span>
      )}
    </>
  );

  if (!onTap) {
    return (
      <span className={cls} style={style} aria-label={label} data-word={word.key}>
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      style={style}
      aria-label={label}
      aria-pressed={isSelected || isPosition}
      data-word={word.key}
      onClick={() => onTap(word)}
    >
      {content}
    </button>
  );
}
