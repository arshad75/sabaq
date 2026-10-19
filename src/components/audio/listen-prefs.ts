"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_TAFSEER, DEFAULT_TRANSLATION, tafseerById, translationById, type TranslationId } from "@/lib/quran/tafseer";

// The Listen page's choices, remembered on this device.
export type ListenPrefs = { tafsir: number; showTafsir: boolean; translation: TranslationId };

const KEY = "sabaq:listen";
const DEFAULTS: ListenPrefs = { tafsir: DEFAULT_TAFSEER, showTafsir: true, translation: DEFAULT_TRANSLATION };
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: ListenPrefs = DEFAULTS;

function read(): ListenPrefs {
  const raw = localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const p = raw ? (JSON.parse(raw) as Partial<ListenPrefs>) : {};
      cached = {
        tafsir: tafseerById(Number(p.tafsir)) ? Number(p.tafsir) : DEFAULTS.tafsir,
        showTafsir: p.showTafsir !== false,
        translation: translationById(Number(p.translation))?.id ?? DEFAULTS.translation,
      };
    } catch {
      cached = DEFAULTS;
    }
  }
  return cached;
}

export function setListenPrefs(patch: Partial<ListenPrefs>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  listeners.forEach((l) => l());
}

export function useListenPrefs(): ListenPrefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => DEFAULTS,
  );
}
