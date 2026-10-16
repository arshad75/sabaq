import type { Metadata } from "next";
import { RecitationPlayer } from "@/components/audio/RecitationPlayer";
import { PublicShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Listen" };

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl bg-gradient-to-br from-tile-sky via-tile-lilac to-tile-mint p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight">Listen and repeat</h1>
          <p className="mt-2 text-muted">
            Hear each ayah recited clearly, then say it back. The slow teaching recitation is best for children;
            switch on “Repeat this ayah” to practise one line until it sticks.
          </p>
        </section>
        <Card className="mt-6">
          <RecitationPlayer />
        </Card>
      </div>
    </PublicShell>
  );
}
