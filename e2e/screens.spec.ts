import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/login",
  "/signup",
  "/join",
  "/privacy",
  "/settings",
  "/session/K7M2QX",
  "/teacher",
  "/teacher/classes/c1",
  "/teacher/students/s1",
  "/teacher/sessions/s1-sess-12",
  "/guardian",
  "/guardian/children/s1",
  "/guardian/children/s1/progress",
  "/student",
  "/student?as=s1",
  "/student/assignments/a1?as=s1",
  "/teacher/classes/c2",
  "/teacher/students/s6",
  "/teacher/sessions/s6-sess-7",
  "/guardian/children/s6/progress",
  "/student?as=s6",
  "/student/assignments/a9?as=s6",
];

const STATE_ROUTES = ["/teacher", "/guardian", "/student?as=s1", "/teacher/students/s1", "/guardian/children/s1/progress"];

test("student screens ask the child to sign in instead of showing another child", async ({ page }) => {
  for (const route of ["/student", "/student/assignments/a1"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Who is reading?" })).toBeVisible();
    await expect(page.getByText(/Assalamu alaikum/)).toHaveCount(0);
  }
});

for (const route of ROUTES) {
  test(`renders ${route} without errors or sideways scrolling`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

for (const route of STATE_ROUTES) {
  for (const state of ["loading", "empty", "error"] as const) {
    test(`${route} has a ${state} state`, async ({ page }) => {
      await page.goto(`${route}${route.includes("?") ? "&" : "?"}state=${state}`);
      if (state === "loading") await expect(page.getByRole("status").first()).toBeAttached();
      if (state === "error") await expect(page.getByRole("alert").first()).toBeVisible();
      if (state === "empty") await expect(page.locator("h1, h2").first()).toBeVisible();
    });
  }
}

test("teacher cannot open another teacher's student", async ({ page }) => {
  await page.goto("/teacher/students/s4");
  await expect(page.getByRole("heading", { name: /can’t find that page/ })).toBeVisible();
});

test("reading view is right-to-left Arabic", async ({ page }) => {
  await page.goto("/session/K7M2QX?role=student");
  const surface = page.locator('[dir="rtl"][lang="ar"]').first();
  await expect(surface).toBeVisible();
  await expect(surface.locator("[data-word]").first()).toBeVisible();
});
