import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/Icon";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Brand href="/student" />
          <Link
            href="/settings"
            aria-label="Settings"
            className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="settings" size={22} />
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 text-lg">
        {children}
      </main>
    </div>
  );
}
