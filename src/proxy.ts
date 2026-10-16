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
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/welcome/:path*",
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
