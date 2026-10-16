import type { ReactNode } from "react";
import type { Account } from "@/lib/supabase/server";
import { Icon } from "@/components/ui/Icon";
import { Brand } from "./AppShell";
import { BottomNav, TopNav, type NavItem } from "./Nav";

/** Shell for real (Supabase) accounts: top nav on wide screens, a tab bar on phones. */
export function AccountShell({ account, children }: { account: Account; children: ReactNode }) {
  const nav: NavItem[] = [
    { href: "/welcome", label: "Home", icon: "home", exact: true },
    { href: "/join", label: "Join", icon: "play" },
    ...(account.isAdmin ? [{ href: "/admin", label: "Admin", icon: "shield" } as NavItem] : []),
    { href: "/account", label: "Account", icon: "user" },
  ];
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
          <Brand href="/welcome" />
          <TopNav items={nav} />
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-medium md:hidden">
            <Icon name="user" size={16} />
            {account.displayName}
          </span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:pb-10">
        {children}
      </main>
      <BottomNav items={nav} />
    </div>
  );
}
