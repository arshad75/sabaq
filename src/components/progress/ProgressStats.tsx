import type { PageProgress } from "@/lib/domain/types";
import { summariseProgress } from "@/lib/progress/derive";
import { Stat } from "@/components/ui/Card";

export function ProgressStats({ progress, pageCount }: { progress: PageProgress[]; pageCount: number }) {
  const { counts, touched } = summariseProgress(progress, pageCount);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Pages read" value={touched} hint={`of ${pageCount}`} />
      <Stat label="Solid" value={counts.solid} />
      <Stat label="In progress" value={counts.in_progress} />
      <Stat label="Needs work" value={counts.needs_work} />
    </div>
  );
}

/** Plain-language summary for guardians; avoids jargon and percentages of the whole Quran. */
export function plainSummary(nickname: string, progress: PageProgress[], sessionsThisMonth: number): string {
  const needs = progress.filter((p) => p.status === "needs_work").map((p) => p.page).sort((a, b) => a - b);
  const solid = progress.filter((p) => p.status === "solid").length;
  const parts = [
    `${nickname} has had ${sessionsThisMonth} ${sessionsThisMonth === 1 ? "lesson" : "lessons"} in the last 30 days.`,
    solid ? `${solid} ${solid === 1 ? "page is" : "pages are"} now solid.` : "No pages are marked solid yet.",
  ];
  if (needs.length) {
    const list = needs.slice(0, 4).join(", ") + (needs.length > 4 ? "…" : "");
    parts.push(`Practising page${needs.length > 1 ? "s" : ""} ${list} at home would help most.`);
  } else {
    parts.push("Nothing needs extra practice right now.");
  }
  return parts.join(" ");
}
