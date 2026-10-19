import { cacheLife } from "next/cache";
import type { NextRequest } from "next/server";
import { fetchTafseer, parseTafseerRef } from "@/lib/quran/tafseer";

async function cachedTafseer(id: number, surah: number, ayah: number) {
  "use cache";
  // Classical tafseer doesn't change.
  cacheLife("max");
  return fetchTafseer(id, surah, ayah);
}

/** One ayah's tafseer, proxied because the source is HTTP-only. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/tafseer/[id]/[surah]/[ayah]">) {
  const { id, surah, ayah } = await ctx.params;
  const ref = parseTafseerRef(id, surah, ayah);
  if (!ref) return Response.json({ error: "Unknown tafseer or ayah" }, { status: 404 });
  try {
    const text = await cachedTafseer(ref.id, ref.surah, ref.ayah);
    if (text === null) return Response.json({ error: "No tafseer for this ayah" }, { status: 404 });
    return Response.json(
      { text },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json({ error: "Tafseer source unavailable" }, { status: 502 });
  }
}
