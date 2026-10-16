import type { Metadata } from "next";
import { SimpleShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <SimpleShell backHref="/login" backLabel="Home">
      <PageHeader title="Settings" description="Saved on this device." />
      <SettingsForm />
    </SimpleShell>
  );
}
