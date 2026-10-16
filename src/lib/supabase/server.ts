import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

export async function createSupabaseServer() {
  const store = await cookies();
  // The client checks token expiry against the clock, so it must run at request time.
  await connection();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export type Account = {
  id: string;
  email: string;
  role: "guardian" | "teacher";
  displayName: string;
  isAdmin: boolean;
};

/** The signed-in person, verified with Supabase Auth, or null. */
export async function getAccount(): Promise<Account | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("role, display_name, is_admin")
    .eq("id", data.user.id)
    .maybeSingle<{ role: Account["role"]; display_name: string; is_admin: boolean }>();
  if (!p) return null;
  return { id: data.user.id, email: data.user.email ?? "", role: p.role, displayName: p.display_name, isAdmin: p.is_admin };
}

export const accountHome = (a: Pick<Account, "isAdmin">) => (a.isAdmin ? "/admin" : "/welcome");
