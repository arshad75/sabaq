"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { supabaseAuth } from "@/lib/auth/mode";

// The Supabase session cookie is readable by the page, so static pages can tell without a server call.
const signedIn = () => supabaseAuth && /(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/.test(document.cookie);

export function AuthNavLink({ className }: { className: string }) {
  const inside = useSyncExternalStore(
    () => () => {},
    signedIn,
    () => false,
  );
  return inside ? (
    <Link href="/welcome" className={className}>
      My account
    </Link>
  ) : (
    <Link href="/login" className={className}>
      {supabaseAuth ? "Sign in" : "Log in"}
    </Link>
  );
}
