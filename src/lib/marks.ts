import type { IconName } from "@/components/ui/Icon";
import type { MarkType, PageStatus } from "@/lib/domain/types";

export type MarkTypeConfig = {
  type: MarkType;
  label: string;
  shortLabel: string;
  description: string;
  icon: IconName;
  colorVar: string;
};

export const MARK_CONFIG: Record<MarkType, MarkTypeConfig> = {
  repeat: {
    type: "repeat",
    label: "Repeat",
    shortLabel: "Repeat",
    description: "Read this again",
    icon: "repeat",
    colorVar: "var(--mark-repeat)",
  },
  pronunciation: {
    type: "pronunciation",
    label: "Pronunciation",
    shortLabel: "Pronounce",
    description: "A letter or vowel was said wrongly",
    icon: "speech",
    colorVar: "var(--mark-pronunciation)",
  },
  tajweed: {
    type: "tajweed",
    label: "Tajweed rule",
    shortLabel: "Tajweed",
    description: "A tajweed rule was missed",
    icon: "wave",
    colorVar: "var(--mark-tajweed)",
  },
  slip: {
    type: "slip",
    label: "Memorisation slip",
    shortLabel: "Slip",
    description: "Forgot or skipped while reciting from memory",
    icon: "slip",
    colorVar: "var(--mark-slip)",
  },
  good: {
    type: "good",
    label: "Good",
    shortLabel: "Good",
    description: "Well done",
    icon: "star",
    colorVar: "var(--mark-good)",
  },
};

export type StatusConfig = { label: string; colorVar: string; pattern: "none" | "dots" | "stripes" | "solid" };

// Patterns make the page grid readable without relying on colour.
export const STATUS_CONFIG: Record<PageStatus, StatusConfig> = {
  not_started: { label: "Not started", colorVar: "var(--status-not-started)", pattern: "none" },
  in_progress: { label: "In progress", colorVar: "var(--status-in-progress)", pattern: "dots" },
  needs_work: { label: "Needs work", colorVar: "var(--status-needs-work)", pattern: "stripes" },
  solid: { label: "Solid", colorVar: "var(--status-solid)", pattern: "solid" },
};
