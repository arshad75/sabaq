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
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Practise the Qaida" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Noorani Qaida page 1" })).toBeVisible();
  await context.setOffline(false);
});
