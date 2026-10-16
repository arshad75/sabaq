"use client";

import { useState } from "react";
import { usePrefs } from "@/lib/prefs";
import type { Book } from "@/lib/domain/types";
import type { PagePoint } from "@/lib/session/events";
import { PageNavBar, PageSurface, PageTurner } from "@/components/session/parts";
import { ImagePageView } from "./ImagePageView";
import { Button } from "@/components/ui/Button";

/** Solo practice inside an assignment's page range; nothing is sent anywhere. */
export function PracticeReader({
  book,
  from,
  to,
  startOpen = false,
}: {
  book: Book;
  from: number;
  to: number;
  startOpen?: boolean;
}) {
  const prefs = usePrefs();
  const [open, setOpen] = useState(startOpen);
  const [page, setPage] = useState(from);
  const [position, setPosition] = useState<string | null>(null);
  const [point, setPoint] = useState<PagePoint | null>(null);
  const go = (p: number) => {
    setPage(Math.min(to, Math.max(from, p)));
    setPosition(null);
    setPoint(null);
  };

  if (!open) {
    return (
      <Button size="lg" variant="secondary" icon="book" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        Practise on my own
      </Button>
    );
  }
  return (
    <section aria-label="Practice reading" className="overflow-hidden rounded-2xl border border-border">
      <div className="bg-bg p-2 sm:p-4">
        <PageTurner onNext={() => go(page + 1)} onPrev={() => go(page - 1)}>
          {book === "qaida" ? (
            <ImagePageView
              page={page}
              position={point}
              onPointTap={setPoint}
              speakLetters={prefs.letterSounds}
              readingTheme={prefs.readingTheme}
              className="mx-auto max-w-2xl"
            />
          ) : (
            <PageSurface
              pageNumber={page}
              positionKey={position}
              readingTheme={prefs.readingTheme}
              onWordTap={(w) => setPosition(w.key)}
            />
          )}
        </PageTurner>
      </div>
      <PageNavBar book={book} page={page} onChange={go} large />
    </section>
  );
}
