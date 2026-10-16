import { MARK_CONFIG } from "@/lib/marks";
import type { MarkType } from "@/lib/domain/types";
import { MarkLegend } from "@/components/ui/Indicators";

type Bucket = { label: string; sessions: number; counts: Record<MarkType, number> };

const ORDER: MarkType[] = ["repeat", "pronunciation", "tajweed", "slip", "good"];

/** Stacked bars of average marks per session for each week, with an accessible table. */
export function TrendChart({ buckets }: { buckets: Bucket[] }) {
  const perSession = buckets.map((b) => ({
    ...b,
    avg: Object.fromEntries(ORDER.map((t) => [t, b.sessions ? b.counts[t] / b.sessions : 0])) as Record<MarkType, number>,
  }));
  const max = Math.max(1, ...perSession.map((b) => ORDER.reduce((s, t) => s + b.avg[t], 0)));
  const H = 140;

  return (
    <figure>
      <div aria-hidden className="flex h-[180px] items-end gap-2 sm:gap-4">
        {perSession.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full max-w-12 flex-col-reverse overflow-hidden rounded-md bg-surface-2" style={{ height: H }}>
              {ORDER.map((t) =>
                b.avg[t] > 0 ? (
                  <div
                    key={t}
                    style={{ height: (b.avg[t] / max) * H, backgroundColor: MARK_CONFIG[t].colorVar }}
                    className="border-t border-surface"
                  />
                ) : null,
              )}
            </div>
            <span className="text-[11px] whitespace-nowrap text-muted">{b.label}</span>
            <span className="text-[11px] text-muted">{b.sessions ? `${b.sessions} sess.` : "—"}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3">
        <MarkLegend />
      </figcaption>
      <table className="sr-only">
        <caption>Average marks per session, by week</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>Sessions</th>
            {ORDER.map((t) => (
              <th key={t}>{MARK_CONFIG[t].label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {perSession.map((b) => (
            <tr key={b.label}>
              <td>{b.label}</td>
              <td>{b.sessions}</td>
              {ORDER.map((t) => (
                <td key={t}>{b.avg[t].toFixed(1)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
