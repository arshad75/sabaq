"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { supabaseAuth } from "@/lib/auth/mode";
import { Icon } from "@/components/ui/Icon";

// The Supabase session cookie is readable by the page, so static pages can tell without a server call.
const signedIn = () => supabaseAuth && /(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/.test(document.cookie);

function useSignedIn() {
  return useSyncExternalStore(
    () => () => {},
    signedIn,
    () => false,
  );
}

/** The logo link: the family's home screen when signed in, the front page otherwise. */
export function HomeLink({ className, children }: { className: string; children: ReactNode }) {
  return (
    <Link href={useSignedIn() ? "/welcome" : "/"} className={className}>
      {children}
    </Link>
  );
}

export function AuthNavLink({ className }: { className: string }) {
  return useSignedIn() ? (
    <Link href="/welcome" className={`${className} gap-1.5`}>
      <Icon name="home" size={16} /> Home
    </Link>
  ) : (
    <Link href="/login" className={className}>
      {supabaseAuth ? "Sign in" : "Log in"}
    </Link>
  );
}
