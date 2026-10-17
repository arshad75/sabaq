import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/next-path";
import { accountHome, createSupabaseServer, getAccount } from "@/lib/supabase/server";

/** Google (OAuth) sign-in lands here with a one-time code, which becomes the session. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = safeNext(url.searchParams.get("next"));
      const account = await getAccount();
      // Families go straight to their learning journey.
      const home = !account ? "/learn" : account.role === "guardian" && !account.isAdmin ? "/learn" : accountHome(account);
      return NextResponse.redirect(new URL(next ?? home, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=google", url.origin));
}
