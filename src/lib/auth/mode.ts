// Real accounts (Supabase Auth) when on; otherwise the prototype's demo logins and mock screens.
export const supabaseAuth = process.env.NEXT_PUBLIC_SUPABASE_AUTH === "1";
// "Continue with Google" is the only sign-in once Google is set up in Supabase; email stays as a fallback until then.
export const googleAuth = supabaseAuth && process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";
