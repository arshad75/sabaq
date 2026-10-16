import type { Metadata } from "next";
import { PublicShell } from "@/components/shell/AppShell";
import { ResetRequestForm } from "@/components/auth/AccountForms";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Reset your password" };

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 mb-6 text-muted">We’ll email you a link to choose a new one.</p>
        <Card>
          <ResetRequestForm />
        </Card>
      </div>
    </PublicShell>
  );
}
