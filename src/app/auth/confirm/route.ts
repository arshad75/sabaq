import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { accountHome, createSupabaseServer, getAccount } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["email", "recovery", "signup", "magiclink", "invite", "email_change"];

/** Landing page for links in Sabaq's emails (sign-in, password reset, confirm). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next");

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Only same-site paths, so the link can't be used to send people elsewhere.
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      const account = await getAccount();
      return NextResponse.redirect(new URL(safeNext ?? (account ? accountHome(account) : "/welcome"), url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?link=expired", url.origin));
}
