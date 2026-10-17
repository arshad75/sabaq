import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/shell/AppShell";
import { JoinForm } from "@/components/session/JoinForm";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { getPreviewState } from "@/lib/preview";

export const metadata: Metadata = { title: "Join a session" };

export default function Page(props: PageProps<"/join">) {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Join a session</h1>
        <p className="mt-1 mb-6 text-muted">Enter the 6-character code from your teacher.</p>
        <Suspense fallback={<LoadingBlock rows={1} />}>
          <JoinContent searchParams={props.searchParams} />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function JoinContent({ searchParams }: Pick<PageProps<"/join">, "searchParams">) {
  const state = await getPreviewState(searchParams);
  const sp = await searchParams;
  const code = typeof sp.code === "string" ? sp.code : "";
  if (state === "loading") return <LoadingBlock rows={1} />;
  if (state === "error") return <ErrorState description="We couldn’t reach the session server. Check your connection." />;
  return (
    <Card>
      <JoinForm
        initialCode={code}
        initialError={sp.reason === "expired" ? "That session has expired. Ask your teacher for a new code." : undefined}
      />
    </Card>
  );
}
