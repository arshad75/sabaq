import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/shell/AppShell";
import { NewPasswordForm } from "@/components/auth/AccountForms";
import { Card } from "@/components/ui/Card";
import { LoadingBlock } from "@/components/ui/States";
import { getAccount } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-1 mb-6 text-muted">You’ll use it to log in from now on.</p>
        <Suspense fallback={<LoadingBlock rows={1} />}>
          <Content />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function Content() {
  // The reset link signs the person in; without that there's nothing to change.
  if (!(await getAccount())) redirect("/login?link=expired");
  return (
    <Card>
      <NewPasswordForm />
    </Card>
  );
}
