import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/shell/AppShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { getPreviewState } from "@/lib/preview";

export const metadata: Metadata = { title: "Create an account" };

export default function Page(props: PageProps<"/signup">) {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
        <p className="mt-1 mb-6 text-muted">Free and open source. We keep as little data as possible.</p>
        <Suspense fallback={<LoadingBlock rows={1} />}>
          <Content searchParams={props.searchParams} />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  const state = await getPreviewState(searchParams);
  if (state === "loading") return <LoadingBlock rows={1} />;
  if (state === "error") return <ErrorState description="Sign-up is unavailable right now. Please try again in a minute." />;
  return (
    <Card>
      <SignupForm />
    </Card>
  );
}
