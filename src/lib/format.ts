import type { AssignmentKind, AssignmentStatus } from "@/lib/domain/types";

// Mock screens format in UTC so server output is deterministic; real data will use the viewer's zone.
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const dateLongFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateLong = (iso: string) => dateLongFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

export function durationMinutes(startIso: string, endIso: string | null): number | null {
  if (!endIso) return null;
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

export function relativeDays(iso: string, nowIso: string): string {
  const days = Math.round(
    (Date.parse(nowIso.slice(0, 10)) - Date.parse(iso.slice(0, 10))) / 86_400_000,
  );
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days === -1) return "tomorrow";
  if (days < 0) return `in ${-days} days`;
  return `${days} days ago`;
}

export function pageRange(from: number, to: number): string {
  return from === to ? `Page ${from}` : `Pages ${from}–${to}`;
}

export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  new: "New lesson",
  recent_revision: "Recent revision",
  old_revision: "Old revision",
};

export const ASSIGNMENT_STATUS: Record<AssignmentStatus, { label: string; tone: "primary" | "success" | "warning" }> = {
  assigned: { label: "To do", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  needs_more_work: { label: "Needs more work", tone: "warning" },
};
