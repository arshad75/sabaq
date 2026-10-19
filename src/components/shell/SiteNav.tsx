"use client";

import Link from "next/link";
import { useSignedIn } from "@/components/auth/AuthNavLink";
import { supabaseAuth } from "@/lib/auth/mode";
import { Icon } from "@/components/ui/Icon";
import { BottomNav, TopNav } from "./Nav";
import { accountNav } from "./nav-items";

const BASE = "min-h-11 items-center rounded-xl px-3 hover:bg-surface-2";
const LINK = `inline-flex ${BASE}`;

/** Public pages: a signed-in family gets the same menu as on their home screen. */
export function SiteNav() {
  if (useSignedIn()) {
    const items = accountNav();
    return (
      <>
        <TopNav items={items} />
        <BottomNav items={items} />
      </>
    );
  }
  return (
    <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
      <Link href="/learn" className={`${LINK} gap-1.5 text-primary`}>
        <Icon name="zap" size={16} /> Learn
      </Link>
      <Link href="/practice" className={`${BASE} hidden sm:inline-flex`}>
        Qaida
      </Link>
      <Link href="/listen" className={`${BASE} hidden md:inline-flex`}>
        Listen
      </Link>
      <Link href="/join" className={LINK}>
        Join<span className="hidden sm:inline">&nbsp;a session</span>
      </Link>
      <Link href="/login" className={LINK}>
        {supabaseAuth ? "Sign in" : "Log in"}
      </Link>
    </nav>
  );
}
