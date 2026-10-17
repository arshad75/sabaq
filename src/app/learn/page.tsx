import type { Metadata } from "next";
import { PublicShell } from "@/components/shell/AppShell";
import { LearnApp } from "@/components/learn/LearnApp";

export const metadata: Metadata = {
  title: "Learn the letters",
  description: "Short, playful lessons on the Arabic letters in Noorani Qaida order, with sounds, stars and streaks. Free, no account needed.",
};

export default function Page() {
  return (
    <PublicShell>
      <LearnApp />
    </PublicShell>
  );
}
