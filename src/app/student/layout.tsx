import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { CURRENT, getStudent } from "@/lib/mock/repo";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const me = getStudent(CURRENT.studentId)!;
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Brand href="/student" />
          <div className="flex items-center gap-2">
            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 font-medium">
              <Icon name="user" size={16} /> {me.nickname}
            </span>
            <Link
              href="/settings"
              aria-label="Settings"
              className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg"
            >
              <Icon name="settings" size={22} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 text-lg">
        {children}
      </main>
    </div>
  );
}
