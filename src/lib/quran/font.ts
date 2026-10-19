import { useEffect, useState } from "react";

// Quran Foundation's IndoPak text must only be shown in its own font (see globals.css), never a fallback.
const FONT = "32px IndoPakNastaleeq";

export function quranFontReady(): Promise<boolean> {
  return document.fonts.load(FONT).then(
    (faces) => faces.length > 0 && document.fonts.check(FONT),
    () => false,
  );
}

export function useQuranFont(): "loading" | "ready" | "failed" {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    void quranFontReady().then((ok) => setState(ok ? "ready" : "failed"));
  }, []);
  return state;
}
