"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

import type { NavItem } from "./nav-items";

export type { NavItem };
type Variant = "top" | "bottom";

const isActive = (item: NavItem, pathname: string | null) =>
  pathname !== null &&
  (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

function NavList({ items, variant, pathname }: { items: NavItem[]; variant: Variant; pathname: string | null }) {
  if (variant === "top") {
    return (
      <ul className="flex items-center gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item, pathname) ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-medium",
                isActive(item, pathname) ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isActive(item, pathname) ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
              isActive(item, pathname) ? "text-primary" : "text-muted",
            )}
          >
            <span
              className={cn(
                "grid h-7 w-14 place-items-center rounded-full transition-colors duration-300",
                isActive(item, pathname) && "bg-primary-soft",
              )}
            >
              <Icon name={item.icon} size={22} />
            </span>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActiveNavList(props: { items: NavItem[]; variant: Variant }) {
  return <NavList {...props} pathname={usePathname()} />;
}

// The pathname is request data, so the active state streams in; the static shell shows plain links.
function ResponsiveNavList(props: { items: NavItem[]; variant: Variant }) {
  return (
    <Suspense fallback={<NavList {...props} pathname={null} />}>
      <ActiveNavList {...props} />
    </Suspense>
  );
}

export function TopNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ResponsiveNavList items={items} variant="top" />
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="Main"
      data-bottom-nav
      className="material edge-above fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ResponsiveNavList items={items} variant="bottom" />
    </nav>
  );
}
