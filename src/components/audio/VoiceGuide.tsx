"use client";

import { useEffect } from "react";
import { usePrefs } from "@/lib/prefs";
import { labelOf, sayLabel } from "@/lib/audio/speak";

/**
 * On child-facing screens, reads a button or link aloud when it's tapped, for children who
 * can't read yet. Areas marked data-no-say (e.g. Qaida letters, which speak Arabic) are skipped.
 */
export function VoiceGuide() {
  const { buttonVoices } = usePrefs();
  useEffect(() => {
    if (!buttonVoices) return;
    const onTap = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest("button, a[href], [role='button']");
      if (!el || el.closest("[data-no-say]")) return;
      sayLabel(labelOf(el));
    };
    document.addEventListener("click", onTap, { capture: true });
    return () => document.removeEventListener("click", onTap, { capture: true });
  }, [buttonVoices]);
  return null;
}
