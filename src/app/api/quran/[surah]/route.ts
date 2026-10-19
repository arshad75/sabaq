import { cacheLife } from "next/cache";
import type { NextRequest } from "next/server";
import { fetchSurah } from "@/lib/quran/qf-content.server";
import { translationText } from "@/lib/quran/tafsir-html";
import { DEFAULT_TRANSLATION, translationById, type SurahReply } from "@/lib/quran/tafseer";

async function cachedSurah(surah: number, translation: number) {
  "use cache";
  // Quran Foundation's terms allow keeping content for at most a week.
  cacheLife("days");
  return fetchSurah(surah, translation);
}

/** A whole surah, ayah by ayah, with one translation; the API credentials stay on the server. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/quran/[surah]">) {
  const { surah: raw } = await ctx.params;
  const surah = /^\d{1,3}$/.test(raw) ? Number(raw) : NaN;
  const t = Number(req.nextUrl.searchParams.get("t") ?? DEFAULT_TRANSLATION);
  if (!(surah >= 1 && surah <= 114) || !translationById(t)) return Response.json({ error: "Unknown surah" }, { status: 404 });
  try {
    const verses = await cachedSurah(surah, t);
    const reply: SurahReply = {
      verses: verses.map((v) => ({ key: v.key, number: v.number, text: v.indopak, translation: translationText(v.translation) })),
    };
    return Response.json(reply, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  } catch (e) {
    console.error("surah:", e instanceof Error ? e.message : "unknown error");
    return Response.json({ error: "Quran source unavailable" }, { status: 502 });
  }
}
