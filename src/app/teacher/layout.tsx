import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/Nav";
import { CURRENT, getProfile } from "@/lib/mock/repo";

const nav: NavItem[] = [
  { href: "/teacher", label: "Home", icon: "home", exact: true },
  { href: "/teacher/classes/c1", label: "Class", icon: "users" },
  { href: "/join", label: "Join", icon: "play" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const me = getProfile(CURRENT.teacherId)!;
  return (
    <AppShell nav={nav} userLabel={me.displayName} roleLabel="Teacher" homeHref="/teacher">
      {children}
    </AppShell>
  );
}
