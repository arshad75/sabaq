import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth/account-actions";
import type { Account } from "@/lib/supabase/server";
import { Icon } from "@/components/ui/Icon";
import { Brand } from "./AppShell";

const navLink = "inline-flex min-h-11 items-center rounded-xl px-3 hover:bg-surface-2";

/** Shell for real (Supabase) accounts. */
export function AccountShell({ account, children }: { account: Account; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-2 px-4">
          <Brand href="/welcome" />
          <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
            {account.isAdmin && (
              <Link href="/admin" className={navLink}>
                Admin
              </Link>
            )}
            <Link href="/welcome" className={navLink}>
              Home
            </Link>
            <form action={signOut}>
              <button type="submit" className={navLink}>
                <Icon name="logout" size={16} className="mr-1.5" /> Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
