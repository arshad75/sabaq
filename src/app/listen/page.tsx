import type { Metadata } from "next";
import { ReadAlong } from "@/components/audio/ReadAlong";
import { PublicShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Listen" };

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl bg-gradient-to-br from-tile-sky via-tile-lilac to-tile-mint p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight">Listen and read along</h1>
          <p className="mt-2 text-muted">
            The whole surah is on the page. The ayah being recited lights up; tap any ayah to hear it, and its tafsir
            opens underneath. The slow teaching recitation is best for children.
          </p>
        </section>
        <Card className="mt-6">
          <ReadAlong />
        </Card>
      </div>
    </PublicShell>
  );
}
