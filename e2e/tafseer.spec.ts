import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Placeholder data shaped like the real routes; never real religious text.
const surah = (n: string, t: string) => ({
  verses: Array.from({ length: n === "73" ? 20 : n === "1" ? 7 : 12 }, (_, i) => ({
    key: `${n}:${i + 1}`,
    number: i + 1,
    text: `[[ayah ${n}:${i + 1}]]`,
    translation: `[[tr ${t} ${n}:${i + 1}]]`,
  })),
});
const tafsir = (id: string, s: string, a: string) =>
  s === "73" && Number(a) <= 9
    ? { verses: Array.from({ length: 9 }, (_, i) => `73:${i + 1}`), blocks: [{ kind: "p", runs: [{ text: `Note ${id}/73/1-9` }] }] }
    : { verses: [`${s}:${a}`], blocks: [{ kind: "p", runs: [{ text: `Note ${id}/${s}/${a}` }] }] };

async function mock(page: Page) {
  const state = { failTafsir: false };
  await page.route("https://everyayah.com/**", (r) => r.abort());
  await page.route("**/api/quran/**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: surah(url.pathname.split("/").pop()!, url.searchParams.get("t") ?? "84") });
  });
  await page.route("**/api/tafseer/**", (route) => {
    if (state.failTafsir) {
      state.failTafsir = false;
      return route.fulfill({ status: 502, json: { error: "down" } });
    }
    const [id, s, a] = new URL(route.request().url()).pathname.split("/").slice(-3);
    return route.fulfill({ json: tafsir(id, s, a) });
  });
  return state;
}

const row = (page: Page, n: number) => page.locator(`li[data-ayah="${n}"]`);

test("read along: tapping an ayah lights it up and opens its tafsir underneath", async ({ page }) => {
  const state = await mock(page);
  await page.goto("/listen");
  await expect(row(page, 1)).toHaveAttribute("aria-current", "true");
  await expect(row(page, 1)).toContainText("[[tr 84 1:1]]");
  await expect(row(page, 1).getByTestId("tafsir-note")).toContainText("Note 168/1/1");
  await expect(page.getByTestId("tafsir-range")).toHaveText("Ayah 1");

  await page.getByRole("button", { name: "Play ayah 3" }).click();
  await expect(row(page, 3)).toHaveAttribute("aria-current", "true");
  await expect(row(page, 3).getByTestId("tafsir-note")).toContainText("Note 168/1/3");
  await expect(page.getByTestId("tafsir-note")).toHaveCount(1);

  await page.getByLabel("Tafsir", { exact: true }).selectOption({ label: "Tafsir Muyassar (Arabic)" });
  await expect(page.getByTestId("tafsir-text")).toContainText("Note 16/1/3");
  await expect(page.getByTestId("tafsir-text").locator("p")).toHaveAttribute("dir", "rtl");

  // A note that explains ayahs 1–9 sits once, after ayah 9, while any of them is recited.
  await page.getByLabel("Surah", { exact: true }).selectOption("73");
  await expect(page.getByTestId("tafsir-range")).toHaveText("Ayahs 1–9");
  await expect(row(page, 9).getByTestId("tafsir-note")).toContainText("Note 16/73/1-9");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(row(page, 2)).toHaveAttribute("aria-current", "true");
  await expect(row(page, 9).getByTestId("tafsir-note")).toBeVisible();
  await expect(page.getByTestId("tafsir-note")).toHaveCount(1);

  await page.getByLabel("Translation", { exact: true }).selectOption({ label: "Saheeh International (English)" });
  await expect(row(page, 1)).toContainText("[[tr 20 73:1]]");

  await page.reload();
  await expect(page.getByLabel("Tafsir", { exact: true })).toHaveValue("16");
  await expect(row(page, 1)).toContainText("[[tr 20 1:1]]");

  state.failTafsir = true;
  await page.getByLabel("Surah", { exact: true }).selectOption("2");
  await expect(page.getByText("Couldn’t load the tafsir.")).toBeVisible();
  await page.getByRole("button", { name: "try again" }).click();
  await expect(page.getByTestId("tafsir-text")).toContainText("Note 16/2/1");

  await page.getByRole("switch", { name: "Show tafsir" }).click();
  await expect(page.getByTestId("tafsir-note")).toHaveCount(0);
});

test("the translation voice is off by default and, when chosen, reads each ayah after the Arabic", async ({ page }) => {
  await mock(page);
  const played: string[] = [];
  const clip = readFileSync("public/audio/letters/ba.mp3");
  await page.route("https://everyayah.com/**", (route) => {
    played.push(new URL(route.request().url()).pathname.replace("/data/", ""));
    return route.fulfill({ body: clip, contentType: "audio/mpeg" });
  });
  await page.goto("/listen");
  await expect(page.getByLabel("Hear the translation")).toHaveValue("off");

  await page.getByLabel("Hear the translation").selectOption("ur");
  // The text switches to the translation being read.
  await expect(page.getByLabel("Translation", { exact: true })).toHaveValue("234");
  await expect(row(page, 1)).toContainText("[[tr 234 1:1]]");

  await page.getByRole("button", { name: "Play ayah 1" }).click();
  await expect(row(page, 2)).toHaveAttribute("aria-current", "true", { timeout: 15_000 });
  expect(played.slice(0, 3)).toEqual([
    "Husary_Muallim_128kbps/001001.mp3",
    "translations/urdu_shamshad_ali_khan_46kbps/001001.mp3",
    "Husary_Muallim_128kbps/001002.mp3",
  ]);
  await expect(page.getByText("translation read by Shamshad Ali Khan")).toBeVisible();
});

test("the Quran and tafsir routes only serve real surahs, ayahs and listed sources", async ({ request }) => {
  for (const path of ["tafseer/999/1/1", "tafseer/168/1/8", "tafseer/168/115/1", "tafseer/168/abc/1", "quran/115", "quran/0", "quran/1?t=999"]) {
    expect((await request.get(`/api/${path}`)).status(), path).toBe(404);
  }
});

// Needs the internet and the Quran Foundation credentials (so: the live site). Our routes use the
// Quran Foundation API; this cross-checks them against Quran.com's public API, a separate copy of the
// same data. Quran text and translations must match exactly; tafsir copies may differ only by tatweel (ـ).
test("Quran text, translation and tafsir match the Quran.com copy", async ({ request }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one run is enough");
  test.setTimeout(180_000);
  const probe = await request.get("/api/tafseer/168/1/1");
  test.skip(probe.status() === 502, "Quran Foundation credentials not configured here");

  const plain = (h: string) =>
    h.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  for (const [s, t] of [["1", "84"], ["2", "20"], ["114", "151"], ["112", "234"]]) {
    const res = await request.get(`/api/quran/${s}?t=${t}`, { timeout: 60_000 });
    expect(res.status(), `surah ${s}`).toBe(200);
    const ours = (await res.json()) as { verses: { key: string; text: string; translation: string }[] };
    const source: { verse_key: string; text_indopak_nastaleeq: string; translations: { text: string }[] }[] = [];
    for (let p = 1; p <= 10; p++) {
      const body = await (await request.get(`https://api.quran.com/api/v4/verses/by_chapter/${s}?fields=text_indopak_nastaleeq&translations=${t}&per_page=50&page=${p}`)).json();
      source.push(...body.verses);
      if (!body.pagination.next_page) break;
    }
    expect(ours.verses.map((v) => v.key), `surah ${s}`).toEqual(source.map((v) => v.verse_key));
    for (const [i, v] of ours.verses.entries()) {
      expect(v.text, v.key).toBe(source[i].text_indopak_nastaleeq);
      expect(v.translation, v.key).toBe(plain(source[i].translations[0].text));
    }
  }

  const words = (s: string) =>
    s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, "").replace(/\s+/g, "").replace(/\u0640/g, "");
  for (const [id, key] of [["168", "2:2"], ["169", "73:2"], ["160", "2:2"], ["16", "2:2"], ["91", "2:2"], ["14", "1:1"], ["15", "114:6"], ["90", "2:255"], ["94", "1:1"]]) {
    const [s, a] = key.split(":");
    const ours = await request.get(`/api/tafseer/${id}/${s}/${a}`);
    expect(ours.status(), `${id}@${key}`).toBe(200);
    const body = (await ours.json()) as { verses: string[]; blocks: { runs: { text: string }[] }[] };
    const source = (await (await request.get(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${key}`)).json()).tafsir;
    expect(body.verses, `${id}@${key}`).toEqual(Object.keys(source.verses));
    const shown = body.blocks.map((b) => b.runs.map((r) => r.text).join("")).join("").replace(/&[a-z#0-9]+;/gi, "");
    expect(words(shown), `${id}@${key}`).toBe(words(source.text.replace(/&(amp|lt|gt|quot|nbsp|#\d+|#x[0-9a-f]+);/gi, "")));
  }
});

// Needs the internet: every translation voice must have the first and last ayah of a few surahs.
test("translation recordings exist for whole surahs", async ({ request }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one run is enough");
  for (const folder of ["English/Sahih_Intnl_Ibrahim_Walk_192kbps", "translations/urdu_shamshad_ali_khan_46kbps"]) {
    for (const [s, last] of [["001", 7], ["002", 286], ["112", 4], ["114", 6]] as const) {
      for (const a of [1, last]) {
        const url = `https://everyayah.com/data/${folder}/${s}${String(a).padStart(3, "0")}.mp3`;
        const res = await request.head(url);
        expect(res.status(), url).toBe(200);
        expect(res.headers()["content-type"], url).toContain("audio");
      }
    }
  }
});

// The learning journey's word lessons: each word must be the source's own word, in order, with its clip.
test("Quran words for the journey match the source, word by word", async ({ request }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one run is enough");
  test.setTimeout(120_000);
  expect((await request.get("/api/quran/115/words")).status()).toBe(404);
  const probe = await request.get("/api/quran/112/words");
  test.skip(probe.status() === 502, "Quran Foundation credentials not configured here");

  for (const s of ["1", "114", "113", "112"]) {
    const res = await request.get(`/api/quran/${s}/words`, { timeout: 60_000 });
    expect(res.status(), `surah ${s}`).toBe(200);
    const ours = (await res.json()) as { verses: { key: string; text: string; words: { id: string; text: string; audio: string }[] }[] };
    const text = ((await (await request.get(`/api/quran/${s}`)).json()) as { verses: { key: string; text: string }[] }).verses;
    const source = (await (await request.get(`https://api.quran.com/api/v4/verses/by_chapter/${s}?words=true&per_page=50`)).json()).verses as {
      verse_key: string;
      words: { position: number; char_type_name: string; audio_url: string }[];
    }[];
    expect(ours.verses.map((v) => v.key)).toEqual(source.map((v) => v.verse_key));
    for (const [i, v] of ours.verses.entries()) {
      expect(v.text, v.key).toBe(text[i].text);
      const src = source[i].words.filter((w) => w.char_type_name === "word");
      expect(v.words.map((w) => w.id), v.key).toEqual(src.map((w) => `${v.key}:${w.position}`));
      expect(v.words.map((w) => w.audio), v.key).toEqual(src.map((w) => `https://verses.quran.foundation/${w.audio_url}`));
      // Every word is found, in order, in the ayah's own text.
      let at = 0;
      for (const w of v.words) {
        const found = v.text.indexOf(w.text, at);
        expect(found, `${w.id} in ${v.key}`).toBeGreaterThanOrEqual(0);
        at = found + w.text.length;
      }
    }
    const clip = await request.head(ours.verses[0].words[0].audio);
    expect(clip.status(), "word clip").toBe(200);
  }
});
