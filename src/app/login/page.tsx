import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/shell/AppShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { getPreviewState } from "@/lib/preview";

export const metadata: Metadata = { title: "Log in" };

export default function Page(props: PageProps<"/login">) {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 mb-6 text-muted">For parents, guardians and teachers.</p>
        <Suspense fallback={<LoadingBlock rows={1} />}>
          <Content searchParams={props.searchParams} />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const state = await getPreviewState(searchParams);
  if (state === "loading") return <LoadingBlock rows={1} />;
  if (state === "error") return <ErrorState description="Sign-in is unavailable right now. Please try again in a minute." />;
  return (
    <Card>
      <LoginForm />
    </Card>
  );
}
