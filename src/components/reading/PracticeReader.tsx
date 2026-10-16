"use client";

import { useState } from "react";
import { usePrefs } from "@/lib/prefs";
import { PageNavBar, PageSurface, PageTurner } from "@/components/session/parts";
import { Button } from "@/components/ui/Button";

/** Solo practice inside an assignment's page range; nothing is sent anywhere. */
export function PracticeReader({ from, to }: { from: number; to: number }) {
  const prefs = usePrefs();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(from);
  const [position, setPosition] = useState<string | null>(null);
  const go = (p: number) => {
    setPage(Math.min(to, Math.max(from, p)));
    setPosition(null);
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
          <PageSurface
            pageNumber={page}
            positionKey={position}
            readingTheme={prefs.readingTheme}
            onWordTap={(w) => setPosition(w.key)}
          />
        </PageTurner>
      </div>
      <PageNavBar page={page} onChange={go} large />
    </section>
  );
}
