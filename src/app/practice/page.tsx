import type { Metadata } from "next";
import { PublicShell } from "@/components/shell/AppShell";
import { PracticeReader } from "@/components/reading/PracticeReader";
import { QAIDA } from "@/lib/books";

export const metadata: Metadata = { title: "Practise the Qaida" };

export default function Page() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-tight">Practise the Qaida</h1>
      <p className="mt-1 mb-6 max-w-2xl text-muted">
        Turn the pages and tap a letter on the first pages to hear its name. Nothing is saved or sent, and once a
        page has been opened it works without internet too.
      </p>
      <PracticeReader book="qaida" from={1} to={QAIDA.pageCount} startOpen />
    </PublicShell>
  );
}
