import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";
import { QAIDA } from "@/lib/books";
import { Icon } from "@/components/ui/Icon";
import { AuthNavLink } from "@/components/auth/AuthNavLink";
import { BottomNav, TopNav, type NavItem } from "./Nav";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 font-semibold tracking-tight">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg">
        <Icon name="book" size={18} />
      </span>
      {site.name}
      <span lang="ar" dir="rtl" className="font-arabic text-lg font-normal text-muted">
        {site.nameArabic}
      </span>
    </Link>
  );
}

export function AppShell({
  nav,
  userLabel,
  roleLabel,
  homeHref,
  children,
  width = "default",
}: {
  nav: NavItem[];
  userLabel: string;
  roleLabel: string;
  homeHref: string;
  children: ReactNode;
  width?: "default" | "narrow";
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Brand href={homeHref} />
          <TopNav items={nav} />
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline">{roleLabel}</span>
            <span
              aria-label={`Signed in as ${userLabel}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 font-medium"
            >
              <Icon name="user" size={16} />
              {userLabel}
            </span>
          </div>
        </div>
      </header>
      <main
        id="main"
        className={cn(
          "mx-auto w-full flex-1 px-4 pt-6 pb-24 md:pb-10",
          width === "narrow" ? "max-w-3xl" : "max-w-6xl",
        )}
      >
        {children}
      </main>
      <BottomNav items={nav} />
    </div>
  );
}

export function SimpleShell({ children, backHref, backLabel }: { children: ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Brand />
          {backHref && (
            <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-medium hover:bg-surface-2">
              <Icon name="chevronLeft" size={16} /> {backLabel ?? "Back"}
            </Link>
          )}
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Brand />
          <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
            <Link href="/learn" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-primary hover:bg-surface-2">
              <Icon name="zap" size={16} /> Learn
            </Link>
            <Link href="/practice" className="hidden min-h-11 items-center rounded-xl px-3 hover:bg-surface-2 sm:inline-flex">
              Practise
            </Link>
            <Link href="/listen" className="hidden min-h-11 items-center rounded-xl px-3 hover:bg-surface-2 md:inline-flex">
              Listen
            </Link>
            <Link href="/join" className="inline-flex min-h-11 items-center rounded-xl px-3 hover:bg-surface-2">
              Join<span className="hidden sm:inline">&nbsp;a session</span>
            </Link>
            <AuthNavLink className="inline-flex min-h-11 items-center rounded-xl px-3 hover:bg-surface-2" />
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        <nav aria-label="Footer" className="flex justify-center gap-4">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
        </nav>
        <p className="mt-2">Open source under Apache-2.0.</p>
        <p className="mt-1 text-xs">
          Qaida pages ©{" "}
          <a href={QAIDA.attribution.url} className="underline-offset-4 hover:underline" rel="noopener noreferrer">
            {QAIDA.attribution.author}
          </a>
          ,{" "}
          <a
            href={QAIDA.attribution.licenceUrl}
            className="underline-offset-4 hover:underline"
            rel="noopener noreferrer license"
          >
            {QAIDA.attribution.licence}
          </a>
        </p>
        <p className="mt-1 text-xs">Letter names recorded by Shaykh Jalal, used with permission.</p>
      </footer>
    </div>
  );
}
