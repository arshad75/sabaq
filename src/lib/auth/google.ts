"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { safeNext } from "./next-path";

/** Starts "Continue with Google". New Google users get a family account automatically. */
export async function continueWithGoogle(form: FormData) {
  const next = safeNext(form.get("next")) ?? "";
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  const callback = `${proto}://${host}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  const supabase = await createSupabaseServer();
  // Supabase only accepts callbacks on its allow-list, so a forged Host header can't redirect elsewhere.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}
