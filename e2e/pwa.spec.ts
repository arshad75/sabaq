import { expect, test } from "@playwright/test";

test("the app is installable and the Qaida practice page keeps working offline", async ({ page, context }) => {
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ short_name: "Sabaq", display: "standalone" });
  expect((await page.request.get("/icon")).headers()["content-type"]).toBe("image/png");

  const sw = await page.request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toContain("no-store");

  await page.goto("/practice");
  await expect(page.getByRole("img", { name: "Noorani Qaida page 1" })).toBeVisible();

  // Only production builds register the worker (dev reloads would fight the cache).
  test.skip(!process.env.E2E_BASE_URL, "service worker runs on production builds only");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  // Open the learning path once while online so its scripts are cached too.
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Learn to read, one letter at a time" })).toBeVisible();
  await page.goto("/practice");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Practise the Qaida" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Noorani Qaida page 1" })).toBeVisible();
  await page.goto("/learn");
  await page.getByLabel("What shall we call you?").fill("Offline");
  await page.getByRole("button", { name: "Start learning" }).click();
  await page.goto("/learn#/lesson/u1-1");
  await expect(page.getByText("New letter")).toBeVisible();
  await context.setOffline(false);
});
