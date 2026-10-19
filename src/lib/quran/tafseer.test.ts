import { afterEach, describe, expect, it, vi } from "vitest";
import { parseTafseerRef, TAFSEERS } from "./tafseer";
import { fetchTafsir } from "./qf-content.server";

describe("tafsir from the Quran Foundation API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("only serves the listed tafsirs and real ayahs", () => {
    expect(parseTafseerRef("168", "2", "255")).toEqual({ id: 168, surah: 2, ayah: 255 });
    expect(parseTafseerRef("168", "1", "8")).toBeNull();
    expect(parseTafseerRef("168", "115", "1")).toBeNull();
    expect(parseTafseerRef("999", "1", "1")).toBeNull();
    for (const bad of ["1.5", "-1", "1e2", "../1", "", undefined]) expect(parseTafseerRef("168", bad, "1")).toBeNull();
    expect(new Set(TAFSEERS.map((t) => t.id)).size).toBe(TAFSEERS.length);
  });

  it("gets a token once, sends both headers, and retries once on an expired token", async () => {
    vi.stubEnv("QF_CLIENT_ID", "client-id");
    vi.stubEnv("QF_CLIENT_SECRET", "client-secret");
    const calls: { url: string; headers: Record<string, string> }[] = [];
    let expireNext = false;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, headers: (init.headers ?? {}) as Record<string, string> });
      if (url.endsWith("/oauth2/token")) return Response.json({ access_token: `token-${calls.length}`, expires_in: 3600 });
      if (expireNext) {
        expireNext = false;
        return new Response("", { status: 401 });
      }
      return Response.json({ tafsir: { verses: { "73:2": {}, "73:3": {} }, text: "<p>[[PLACEHOLDER]]</p>" } });
    });

    expect(await fetchTafsir(168, 73, 2)).toEqual({ verses: ["73:2", "73:3"], html: "<p>[[PLACEHOLDER]]</p>" });
    expect(calls[0].url).toBe("https://oauth2.quran.foundation/oauth2/token");
    expect(calls[0].headers.Authorization).toBe(`Basic ${Buffer.from("client-id:client-secret").toString("base64")}`);
    expect(calls[1].url).toBe("https://apis.quran.foundation/content/api/v4/tafsirs/168/by_ayah/73:2");
    expect(calls[1].headers).toMatchObject({ "x-auth-token": "token-1", "x-client-id": "client-id" });

    await fetchTafsir(168, 73, 3);
    expect(calls.filter((c) => c.url.endsWith("/oauth2/token"))).toHaveLength(1);

    expireNext = true;
    await fetchTafsir(168, 73, 4);
    expect(calls.filter((c) => c.url.endsWith("/oauth2/token"))).toHaveLength(2);
  });

  it("returns null when there's no tafsir and throws when the API is down", async () => {
    vi.stubEnv("QF_CLIENT_ID", "client-id");
    vi.stubEnv("QF_CLIENT_SECRET", "client-secret");
    let status = 404;
    vi.stubGlobal("fetch", async (url: string) =>
      url.endsWith("/oauth2/token") ? Response.json({ access_token: "t", expires_in: 3600 }) : new Response("", { status }),
    );
    expect(await fetchTafsir(168, 1, 1)).toBeNull();
    status = 503;
    await expect(fetchTafsir(168, 1, 1)).rejects.toThrow();
  });
});
