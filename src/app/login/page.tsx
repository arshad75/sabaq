import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/shell/AppShell";
import { AuthForm } from "@/components/auth/AuthForm";
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
        <p className="mt-6 text-center text-sm text-muted">
          Prototype shortcuts:{" "}
          <Link href="/guardian" className="underline">
            guardian
          </Link>{" "}
          ·{" "}
          <Link href="/teacher" className="underline">
            teacher
          </Link>{" "}
          ·{" "}
          <Link href="/student" className="underline">
            student
          </Link>
        </p>
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
      <AuthForm mode="login" />
    </Card>
  );
}
