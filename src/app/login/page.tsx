import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/shell/AppShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Card } from "@/components/ui/Card";
import { Banner, ErrorState, LoadingBlock } from "@/components/ui/States";
import { googleAuth } from "@/lib/auth/mode";
import { safeNext } from "@/lib/auth/next-path";
import { getPreviewState } from "@/lib/preview";

export const metadata: Metadata = { title: "Log in" };

export default function Page(props: PageProps<"/login">) {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">{googleAuth ? "Sign in to Sabaq" : "Log in"}</h1>
        <p className="mt-1 mb-6 text-muted">
          {googleAuth
            ? "Free for every family. Your learning journey is saved to your account and follows you to any device."
            : "For parents, guardians and teachers."}
        </p>
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
  const params = await searchParams;
  const expired = params.link === "expired";
  const next = safeNext(params.next) ?? undefined;
  const showEmail = !googleAuth || params.email === "1";
  return (
    <Card className="space-y-5">
      {params.error === "google" && (
        <Banner tone="danger">Google sign-in didn’t finish. Please try again.</Banner>
      )}
      {googleAuth && (
        <>
          <GoogleButton next={next} />
          <p className="text-center text-sm text-muted">
            New or returning, it’s the same button. Your free account is made the first time.
          </p>
        </>
      )}
      {showEmail && (
        <>
          {googleAuth && (
            <p className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              or with email
            </p>
          )}
          <LoginForm
            showSignup={!googleAuth}
            notice={expired ? "That link has expired or was already used. Please log in." : undefined}
          />
        </>
      )}
    </Card>
  );
}
