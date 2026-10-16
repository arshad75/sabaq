"use client";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 p-6">
      <ErrorState
        description="Something went wrong on our side. Your lesson data is safe."
        action={<Button onClick={retry}>Try again</Button>}
      />
    </main>
  );
}
