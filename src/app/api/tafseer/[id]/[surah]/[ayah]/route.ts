import { cacheLife } from "next/cache";
import type { NextRequest } from "next/server";
import { fetchTafsir } from "@/lib/quran/qf-content.server";
import { tafsirBlocks } from "@/lib/quran/tafsir-html";
import { parseTafseerRef, type TafsirReply } from "@/lib/quran/tafseer";

async function cachedTafsir(id: number, surah: number, ayah: number) {
  "use cache";
  // Quran Foundation's terms allow keeping content for at most a week.
  cacheLife("days");
  return fetchTafsir(id, surah, ayah);
}

/** One ayah's tafsir as plain blocks; the API credentials stay on the server. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/tafseer/[id]/[surah]/[ayah]">) {
  const { id, surah, ayah } = await ctx.params;
  const ref = parseTafseerRef(id, surah, ayah);
  if (!ref) return Response.json({ error: "Unknown tafsir or ayah" }, { status: 404 });
  try {
    const tafsir = await cachedTafsir(ref.id, ref.surah, ref.ayah);
    if (!tafsir) return Response.json({ error: "No tafsir for this ayah" }, { status: 404 });
    const reply: TafsirReply = { verses: tafsir.verses, blocks: tafsirBlocks(tafsir.html) };
    return Response.json(reply, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  } catch (e) {
    console.error("tafsir:", e instanceof Error ? e.message : "unknown error");
    return Response.json({ error: "Tafsir source unavailable" }, { status: 502 });
  }
}
