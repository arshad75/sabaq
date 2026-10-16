import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/shell/AccountShell";
import { ConfirmDelete } from "@/components/child/forms";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Tile, TileGrid } from "@/components/ui/Friendly";
import { LoadingBlock } from "@/components/ui/States";
import { signOut } from "@/lib/auth/account-actions";
import { deleteMyAccount } from "@/lib/data/child-actions";
import { getAccount } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your account" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const account = await getAccount();
  if (!account) redirect("/login");
  return (
    <AccountShell account={account}>
      <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-muted">
        {account.displayName} · {account.email} · {account.role === "teacher" ? "Teacher" : "Parent"}
        {account.isAdmin && " · Admin"}
      </p>

      <div className="mt-6">
        <TileGrid>
          <Tile href="/account/export" download icon="download" color="mint" title="Download my data" subtitle="Everything, as a file" />
          <Tile href="/settings" icon="settings" color="sky" title="Display" subtitle="Theme and text size" />
          <Tile href="/privacy" icon="shield" color="lilac" title="Privacy" subtitle="What we keep" />
          <Tile href="/reset" icon="key" color="sun" title="Password" subtitle="Change it by email" />
        </TileGrid>
      </div>

      <div className="mt-8 grid gap-6">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Log out</h2>
            <p className="text-sm text-muted">On a shared tablet, log out when you’re done.</p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="secondary" icon="logout">
              Log out
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Delete my account" description="This can’t be undone." />
          <ConfirmDelete
            action={deleteMyAccount}
            label="Delete my account"
            explanation={
              account.role === "guardian"
                ? "Deletes your account and everything about your children: lessons, marks, progress, homework and requests. Download your data first if you want a copy."
                : "Deletes your account. Lessons you taught stay with the families, without your name."
            }
          />
        </Card>
      </div>
    </AccountShell>
  );
}
