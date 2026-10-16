import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { MARK_CONFIG, STATUS_CONFIG } from "@/lib/marks";
import type { MarkType, PageStatus } from "@/lib/domain/types";
import { Icon } from "./Icon";

export type ConnectionState = "connected" | "connecting" | "reconnecting" | "offline" | "waiting";

const connectionLabels: Record<ConnectionState, string> = {
  connected: "Connected",
  connecting: "Connecting",
  reconnecting: "Reconnecting",
  offline: "Offline",
  waiting: "Waiting",
};

const connectionColors: Record<ConnectionState, string> = {
  connected: "bg-success",
  connecting: "bg-warning",
  reconnecting: "bg-warning",
  offline: "bg-danger",
  waiting: "bg-muted",
};

export function ConnectionDot({
  state,
  who,
  showLabel = true,
}: {
  state: ConnectionState;
  who?: string;
  showLabel?: boolean;
}) {
  const label = `${who ? `${who}: ` : ""}${connectionLabels[state]}`;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" role="status" aria-label={label} title={label}>
      <span
        aria-hidden
        className={cn(
          "inline-block size-2.5 rounded-full",
          connectionColors[state],
          (state === "connecting" || state === "reconnecting") && "animate-pulse",
        )}
      />
      {showLabel && <span>{label}</span>}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 64,
  label,
}: {
  /** 0..1 */
  value: number;
  size?: number;
  label: string;
}) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label}: ${pct}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span aria-hidden className="absolute text-sm font-semibold">
        {pct}%
      </span>
    </div>
  );
}

export function MarkChip({
  type,
  count,
  compact = false,
  className,
}: {
  type: MarkType;
  count?: number;
  compact?: boolean;
  className?: string;
}) {
  const cfg = MARK_CONFIG[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap",
        className,
      )}
      style={{ color: cfg.colorVar, borderColor: cfg.colorVar }}
    >
      <Icon name={cfg.icon} size={16} />
      <span className={compact ? "sr-only" : "text-fg"}>{cfg.shortLabel}</span>
      {count !== undefined && <span className="tabular-nums text-fg">{count}</span>}
    </span>
  );
}

export function StatusSwatch({ status, size = 14 }: { status: PageStatus; size?: number }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-[3px] border border-black/10"
      style={{ width: size, height: size, ...statusStyle(status) }}
      data-pattern={cfg.pattern}
    />
  );
}

export function statusStyle(status: PageStatus): CSSProperties {
  const cfg = STATUS_CONFIG[status];
  switch (cfg.pattern) {
    case "dots":
      return {
        backgroundColor: cfg.colorVar,
        backgroundImage: "radial-gradient(rgba(0,0,0,.35) 1px, transparent 1.5px)",
        backgroundSize: "5px 5px",
      };
    case "stripes":
      return {
        backgroundColor: cfg.colorVar,
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(0,0,0,.28) 0 1.5px, transparent 1.5px 5px)",
      };
    default:
      return { backgroundColor: cfg.colorVar };
  }
}

export function StatusBadge({ status }: { status: PageStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-sm font-medium">
      <StatusSwatch status={status} size={12} />
      {STATUS_CONFIG[status].label}
    </span>
  );
}

export function StatusLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted" aria-label="Page status legend">
      {(Object.keys(STATUS_CONFIG) as PageStatus[]).map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <StatusSwatch status={s} />
          {STATUS_CONFIG[s].label}
        </li>
      ))}
    </ul>
  );
}

export function MarkLegend() {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Mark types">
      {(Object.keys(MARK_CONFIG) as MarkType[]).map((t) => (
        <li key={t}>
          <MarkChip type={t} />
        </li>
      ))}
    </ul>
  );
}
