import { expect, test } from "@playwright/test";

test("the tafseer follows the ayah, remembers the choice, and recovers from a failed load", async ({ page }) => {
  let failNext = false;
  await page.route("**/api/tafseer/**", (route) => {
    if (failNext) {
      failNext = false;
      return route.fulfill({ status: 502, json: { error: "down" } });
    }
    const [id, surah, ayah] = new URL(route.request().url()).pathname.split("/").slice(-3);
    return route.fulfill({ json: { text: `Note ${id}/${surah}/${ayah}` } });
  });

  await page.goto("/listen");
  const text = page.getByTestId("tafseer-text");
  await expect(page.getByRole("heading", { name: "Tafseer, ayah 1" })).toBeVisible();
  await expect(text).toHaveText("Note 10/1/1");
  await expect(text).toHaveAttribute("dir", "ltr");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Tafseer, ayah 2" })).toBeVisible();
  await expect(text).toHaveText("Note 10/1/2");

  await page.getByLabel("Tafseer", { exact: true }).selectOption({ label: "Tafsir al-Jalalayn, short (Arabic)" });
  await expect(text).toHaveText("Note 2/1/2");
  await expect(text).toHaveAttribute("dir", "rtl");
  await page.reload();
  await expect(text).toHaveText("Note 2/1/1");

  failNext = true;
  await page.getByLabel("Surah").selectOption("2");
  await expect(page.getByText("Couldn’t load the tafseer.")).toBeVisible();
  await page.getByRole("button", { name: "try again" }).click();
  await expect(text).toHaveText("Note 2/2/1");

  await page.getByLabel("Show tafseer").click();
  await expect(text).toHaveCount(0);
});

test("the tafseer route only serves listed tafseers and real ayahs", async ({ request }) => {
  for (const path of ["1/1/1", "2/1/8", "2/115/1", "2/abc/1"]) {
    expect((await request.get(`/api/tafseer/${path}`)).status(), path).toBe(404);
  }
});
