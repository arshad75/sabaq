// Real accounts (Supabase Auth) when on; otherwise the prototype's demo logins and mock screens.
export const supabaseAuth = process.env.NEXT_PUBLIC_SUPABASE_AUTH === "1";
