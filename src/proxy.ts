import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Screens still wired to demo data; real accounts must not see them.
const PROTOTYPE_ONLY = ["/guardian", "/teacher", "/student", "/login/student"];

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SUPABASE_AUTH !== "1") return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (PROTOTYPE_ONLY.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }
  // Visitors without a session see the front page without a call to the auth server.
  const hasSession = request.cookies.getAll().some((c) => /^sb-.+-auth-token/.test(c.name));
  if (path === "/" && !hasSession) return NextResponse.next();

  // Refresh an expiring session and pass the new cookies to both the page and the browser.
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  // Signed in, the front page (and the installed app's start page) is the family's home screen.
  if (path === "/" && data.user) {
    const home = NextResponse.redirect(new URL("/welcome", request.url));
    for (const c of response.cookies.getAll()) home.cookies.set(c);
    return home;
  }
  return response;
}

export const config = {
  matcher: [
    "/",
    "/welcome/:path*",
    "/lessons/:path*",
    "/children/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/login/:path*",
    "/signup",
    "/reset/:path*",
    "/settings",
    "/guardian/:path*",
    "/teacher/:path*",
    "/student/:path*",
  ],
};
