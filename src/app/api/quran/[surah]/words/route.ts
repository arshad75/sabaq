import { cacheLife } from "next/cache";
import { fetchSurahWords } from "@/lib/quran/qf-content.server";
import { toWordVerses, type WordsReply } from "@/lib/quran/words";

async function cachedWords(surah: number) {
  "use cache";
  // Quran Foundation's terms allow keeping content for at most a week.
  cacheLife("days");
  return toWordVerses(await fetchSurahWords(surah));
}

/** A surah word by word, with each word's recorded clip, for the learning journey. */
export async function GET(_req: Request, ctx: RouteContext<"/api/quran/[surah]/words">) {
  const { surah: raw } = await ctx.params;
  const surah = /^\d{1,3}$/.test(raw) ? Number(raw) : NaN;
  if (!(surah >= 1 && surah <= 114)) return Response.json({ error: "Unknown surah" }, { status: 404 });
  try {
    const reply: WordsReply = { verses: await cachedWords(surah) };
    return Response.json(reply, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  } catch (e) {
    console.error("words:", e instanceof Error ? e.message : "unknown error");
    return Response.json({ error: "Quran source unavailable" }, { status: 502 });
  }
}
