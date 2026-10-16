import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/Nav";
import { CURRENT, getProfile } from "@/lib/mock/repo";

const nav: NavItem[] = [
  { href: "/guardian", label: "Home", icon: "home", exact: true },
  { href: "/privacy", label: "Privacy", icon: "shield" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function GuardianLayout({ children }: { children: ReactNode }) {
  const me = getProfile(CURRENT.guardianId)!;
  return (
    <AppShell nav={nav} userLabel={me.displayName} roleLabel="Guardian" homeHref="/guardian">
      {children}
    </AppShell>
  );
}
