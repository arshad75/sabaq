// Server only: holds the Quran Foundation credentials. Imported by the tafsir route, never by pages.
const PRODUCTION = { auth: "https://oauth2.quran.foundation", api: "https://apis.quran.foundation/content/api/v4" };
const PRELIVE = { auth: "https://prelive-oauth2.quran.foundation", api: "https://apis-prelive.quran.foundation/content/api/v4" };

const env = () => (process.env.QF_ENV === "prelive" ? PRELIVE : PRODUCTION);
let token: { value: string; until: number } | null = null;

async function accessToken(force = false): Promise<string> {
  if (!force && token && Date.now() < token.until) return token.value;
  const id = process.env.QF_CLIENT_ID;
  const secret = process.env.QF_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Quran Foundation credentials are not configured");
  const res = await fetch(`${env().auth}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=content",
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Quran Foundation token request failed (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  // Renew a minute early so a request never goes out with an expiring token.
  token = { value: body.access_token, until: Date.now() + (body.expires_in - 60) * 1000 };
  return token.value;
}

/** One ayah's tafsir exactly as the API sends it, or null if it has none. Throws if the API is down. */
export async function fetchTafsir(id: number, surah: number, ayah: number): Promise<{ verses: string[]; html: string } | null> {
  const get = async (force: boolean) =>
    fetch(`${env().api}/tafsirs/${id}/by_ayah/${surah}:${ayah}`, {
      headers: { "x-auth-token": await accessToken(force), "x-client-id": process.env.QF_CLIENT_ID! },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  let res = await get(false);
  if (res.status === 401) res = await get(true);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Quran Foundation returned ${res.status}`);
  const t = ((await res.json()) as { tafsir?: { verses?: Record<string, unknown>; text?: unknown } }).tafsir;
  if (!t || typeof t.text !== "string" || !t.text) return null;
  return { verses: Object.keys(t.verses ?? {}), html: t.text };
}
