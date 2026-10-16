import type { Metadata } from "next";
import { SimpleShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { supabaseAuth } from "@/lib/auth/mode";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <SimpleShell backHref={supabaseAuth ? "/account" : "/login"} backLabel={supabaseAuth ? "Account" : "Home"}>
      <PageHeader title="Settings" description="Saved on this device." />
      <SettingsForm />
    </SimpleShell>
  );
}
