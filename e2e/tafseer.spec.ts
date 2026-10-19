import { expect, test } from "@playwright/test";

// Placeholder replies shaped like the real route; never real religious text.
const reply = (id: string, surah: string, ayah: string) =>
  surah === "73" && Number(ayah) <= 9
    ? { verses: ["73:1", "73:2", "73:3", "73:4", "73:5", "73:6", "73:7", "73:8", "73:9"], blocks: [{ kind: "p", runs: [{ text: `Note ${id}/73/1-9` }] }] }
    : { verses: [`${surah}:${ayah}`], blocks: [{ kind: "h", runs: [{ text: "[[heading]]" }] }, { kind: "p", runs: [{ text: `Note ${id}/${surah}/${ayah}` }] }] };

test("the tafseer follows the ayah, groups shared notes, remembers the choice, and recovers", async ({ page }) => {
  let failNext = false;
  await page.route("**/api/tafseer/**", (route) => {
    if (failNext) {
      failNext = false;
      return route.fulfill({ status: 502, json: { error: "down" } });
    }
    const [id, surah, ayah] = new URL(route.request().url()).pathname.split("/").slice(-3);
    return route.fulfill({ json: reply(id, surah, ayah) });
  });

  await page.goto("/listen");
  const text = page.getByTestId("tafseer-text");
  await expect(page.getByRole("heading", { name: "Tafseer, ayah 1" })).toBeVisible();
  await expect(text).toContainText("Note 168/1/1");
  await expect(text.getByRole("heading", { name: "[[heading]]" })).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(text).toContainText("Note 168/1/2");

  await page.getByLabel("Tafseer", { exact: true }).selectOption({ label: "Tafsir Muyassar (Arabic)" });
  await expect(text).toContainText("Note 16/1/2");
  await expect(text.locator("p")).toHaveAttribute("dir", "rtl");
  await page.reload();
  await expect(text).toContainText("Note 16/1/1");

  // One note for ayahs 1–9: it says so, and moving within the group keeps the same note.
  await page.getByLabel("Surah").selectOption("73");
  await expect(page.getByTestId("tafseer-covers")).toHaveText("Explains ayahs 1–9 together");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Tafseer, ayah 2" })).toBeVisible();
  await expect(text).toContainText("Note 16/73/1-9");

  failNext = true;
  await page.getByLabel("Surah").selectOption("2");
  await expect(page.getByText("Couldn’t load the tafseer.")).toBeVisible();
  await page.getByRole("button", { name: "try again" }).click();
  await expect(text).toContainText("Note 16/2/1");

  await page.getByLabel("Show tafseer").click();
  await expect(text).toHaveCount(0);
});

test("the tafseer route only serves listed tafsirs and real ayahs", async ({ request }) => {
  for (const path of ["999/1/1", "168/1/8", "168/115/1", "168/abc/1"]) {
    expect((await request.get(`/api/tafseer/${path}`)).status(), path).toBe(404);
  }
});

// Needs the internet and the Quran Foundation credentials (so: the live site). Every word the source
// sends must reach the page, for a fixed sample across all offered tafsirs.
test("tafsir text matches the Quran Foundation source", async ({ request }, info) => {
  test.skip(info.project.name !== "tablet-portrait", "one run is enough");
  test.setTimeout(120_000);
  const probe = await request.get("/api/tafseer/168/1/1");
  test.skip(probe.status() === 502, "Quran Foundation credentials not configured here");
  const words = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, "").replace(/\s+/g, "");
  for (const [id, key] of [["168", "2:2"], ["169", "73:2"], ["160", "2:2"], ["16", "2:2"], ["91", "2:2"], ["14", "1:1"], ["15", "114:6"], ["90", "2:255"], ["94", "1:1"]]) {
    const [surah, ayah] = key.split(":");
    const ours = await request.get(`/api/tafseer/${id}/${surah}/${ayah}`);
    expect(ours.status(), `${id}@${key}`).toBe(200);
    const body = (await ours.json()) as { verses: string[]; blocks: { runs: { text: string }[] }[] };
    const source = (await (await request.get(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${key}`)).json()).tafsir;
    expect(body.verses, `${id}@${key}`).toEqual(Object.keys(source.verses));
    const shown = body.blocks.map((b) => b.runs.map((r) => r.text).join("")).join("").replace(/&[a-z#0-9]+;/gi, "");
    expect(words(shown), `${id}@${key}`).toBe(words(source.text.replace(/&(amp|lt|gt|quot|nbsp|#\d+|#x[0-9a-f]+);/gi, "")));
  }
});
