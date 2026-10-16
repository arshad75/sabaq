"use client";

import { useSyncExternalStore } from "react";
import { PREFS_KEY } from "./prefs-boot";

export { PREFS_KEY };

export type ThemePref = "system" | "light" | "dark";
export type ReadingTheme = "paper" | "sepia" | "night";

export type Prefs = {
  theme: ThemePref;
  readingTheme: ReadingTheme;
  textScale: number;
  language: "en";
  notifyAssignments: boolean;
  notifySessionSummary: boolean;
  letterSounds: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  readingTheme: "paper",
  textScale: 1,
  language: "en",
  notifyAssignments: true,
  notifySessionSummary: true,
  letterSounds: true,
};

const listeners = new Set<() => void>();
let cached: Prefs | null = null;

function read(): Prefs {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    cached = raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    cached = DEFAULT_PREFS;
  }
  return cached;
}

export function applyPrefsToDocument(p: Prefs) {
  const el = document.documentElement;
  if (p.theme === "system") delete el.dataset.theme;
  else el.dataset.theme = p.theme;
  el.style.setProperty("--reading-scale", String(p.textScale));
}

export function setPrefs(patch: Partial<Prefs>) {
  const next = { ...read(), ...patch };
  cached = next;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Private mode etc.: keep in memory for this visit.
  }
  applyPrefsToDocument(next);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== PREFS_KEY) return;
    cached = null;
    applyPrefsToDocument(read());
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
}
