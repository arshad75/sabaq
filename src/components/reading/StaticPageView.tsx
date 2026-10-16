"use client";

import { ReadingView } from "./ReadingView";
import type { QuranPage } from "@/lib/quran/types";
import type { MarkType } from "@/lib/domain/types";
import { usePrefs } from "@/lib/prefs";

/** Read-only page with marks, for summaries and assignment previews. */
export function StaticPageView({
  page,
  marks,
  isPlaceholder,
}: {
  page: QuranPage;
  marks: { key: string; markType: MarkType }[];
  isPlaceholder: boolean;
}) {
  const prefs = usePrefs();
  return (
    <ReadingView
      page={page}
      marks={new Map(marks.map((m) => [m.key, m]))}
      readingTheme={prefs.readingTheme}
      isPlaceholder={isPlaceholder}
    />
  );
}
