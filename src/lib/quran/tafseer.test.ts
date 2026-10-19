import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTafseer, parseTafseerRef, TAFSEERS } from "./tafseer";

describe("tafseer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("only serves the listed tafseers and real ayahs", () => {
    expect(parseTafseerRef("2", "2", "255")).toEqual({ id: 2, surah: 2, ayah: 255 });
    expect(parseTafseerRef("2", "1", "7")).not.toBeNull();
    expect(parseTafseerRef("2", "1", "8")).toBeNull();
    expect(parseTafseerRef("2", "115", "1")).toBeNull();
    expect(parseTafseerRef("2", "0", "1")).toBeNull();
    // Copyrighted modern works (at-Tafsir al-Muyassar, Tantawi, Arberry) aren't offered.
    for (const id of ["1", "3", "5", "9", "11"]) expect(parseTafseerRef(id, "1", "1")).toBeNull();
    for (const bad of ["1.5", "-1", "1e2", "../1", "", undefined]) expect(parseTafseerRef("2", bad, "1")).toBeNull();
  });

  it("has English names only, so nothing Arabic is hard-coded", () => {
    for (const t of TAFSEERS) expect(t.name + t.author).toMatch(/^[\x20-\x7E]+$/);
  });

  it("returns the source's text unchanged, null when there is none, and throws when the source is down", async () => {
    const calls: string[] = [];
    const placeholder = "  [[PLACEHOLDER: not real tafseer]]\n";
    let reply: Response = Response.json({ text: placeholder });
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return reply;
    });
    expect(await fetchTafseer(10, 2, 2)).toBe(placeholder);
    expect(calls).toEqual(["http://api.quran-tafseer.com/tafseer/10/2/2"]);
    reply = new Response("", { status: 404 });
    expect(await fetchTafseer(10, 2, 2)).toBeNull();
    reply = new Response("", { status: 500 });
    await expect(fetchTafseer(10, 2, 2)).rejects.toThrow();
  });
});
