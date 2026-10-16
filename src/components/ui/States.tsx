import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-surface-2", className)} />;
}

export function LoadingBlock({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-9 w-1/2" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon = "info",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-surface-2 p-3 text-muted">
        <Icon name={icon} size={28} />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please check your connection and try again.",
  action,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl border border-danger/30 bg-danger-soft px-6 py-10 text-center"
    >
      <div className="mb-3 text-danger">
        <Icon name="alert" size={32} />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type BannerTone = "info" | "warning" | "danger" | "success";

const bannerTones: Record<BannerTone, { cls: string; icon: IconName }> = {
  info: { cls: "bg-primary-soft text-fg border-primary/30", icon: "info" },
  warning: { cls: "bg-warning-soft text-fg border-warning/40", icon: "alert" },
  danger: { cls: "bg-danger-soft text-fg border-danger/40", icon: "alert" },
  success: { cls: "bg-success-soft text-fg border-success/40", icon: "check" },
};

export function Banner({
  tone = "info",
  icon,
  children,
  action,
  className,
}: {
  tone?: BannerTone;
  icon?: IconName;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = bannerTones[tone];
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", t.cls, className)}
    >
      <Icon name={icon ?? t.icon} className="shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
