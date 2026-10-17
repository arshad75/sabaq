import { expect, test } from "@playwright/test";
import { noSideScroll, play, seed, shot } from "./learn-helpers";

test("a new learner signs up, finishes a perfect first lesson and keeps their streak", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Learn to read, one letter at a time" })).toBeVisible();
  await shot(page, "welcome");
  await page.getByLabel("What shall we call you?").fill("Amina");
  await page.getByRole("button", { name: "Start learning" }).click();

  await expect(page.getByText("Assalamu alaikum, Amina!")).toBeVisible();
  await expect(page.locator('[data-lesson="u1-1"]')).toHaveAttribute("data-state", "current");
  await expect(page.locator('[data-lesson="u1-2"]')).toHaveAttribute("data-state", "locked");
  await noSideScroll(page);
  await shot(page, "path");

  await page.locator('[data-lesson="u1-2"]').click();
  await expect(page.getByText("Opens after you finish the lesson above.")).toBeVisible();
  await page.getByRole("button", { name: "Begin · +10 Noor" }).click();
  await expect(page.getByText("New letter")).toBeVisible();
  await noSideScroll(page);

  const kinds = await play(page, { shots: "l1" });
  expect([...kinds]).toEqual(expect.arrayContaining(["info", "choice", "match"]));

  await expect(page.getByRole("heading", { name: "MashaAllah, perfect!" })).toBeVisible();
  await expect(page.getByLabel("3 of 3 lamps lit")).toBeVisible();
  await expect(page.getByText("+15")).toBeVisible();
  await shot(page, "done");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "days in a row!" })).toBeVisible();
  await shot(page, "streak");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("First step")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.locator('[data-lesson="u1-1"]')).toHaveAttribute("data-state", "done");
  await expect(page.locator('[data-lesson="u1-2"]')).toHaveAttribute("data-state", "current");
  await expect(page.getByTestId("streak")).toHaveAccessibleName("1 day streak");
  await expect(page.getByTestId("xp")).toHaveAccessibleName("15 Noor");

  await page.reload();
  await expect(page.getByTestId("xp")).toHaveAccessibleName("15 Noor");
  await expect(page.locator('[data-lesson="u1-2"]')).toHaveAttribute("data-state", "current");
});

test("a mistake is corrected, asked again, and costs a star", async ({ page }) => {
  await seed(page);
  await page.goto("/learn#/lesson/u1-1");
  await play(page, { mistake: true, shots: "mistake" });
  await expect(page.getByRole("heading", { name: "Lesson complete!" })).toBeVisible();
  await expect(page.getByLabel("2 of 3 lamps lit")).toBeVisible();
  await expect(page.getByText("+10")).toBeVisible();
});

test("quitting a lesson asks first and saves nothing", async ({ page }) => {
  await seed(page);
  await page.goto("/learn#/lesson/u1-1");
  await page.getByRole("button", { name: "Quit lesson" }).click();
  await expect(page.getByRole("heading", { name: "Wait, don’t go yet!" })).toBeVisible();
  await page.getByRole("button", { name: "Keep learning" }).click();
  await expect(page.getByText("New letter")).toBeVisible();
  await page.getByRole("button", { name: "Quit lesson" }).click();
  await page.getByRole("button", { name: "End lesson" }).click();
  await expect(page.locator('[data-lesson="u1-1"]')).toHaveAttribute("data-state", "current");
  await expect(page.getByTestId("xp")).toHaveAccessibleName("0 Noor");
});

test("locked lessons can't be opened from the address bar", async ({ page }) => {
  await seed(page);
  await page.goto("/learn#/lesson/u3-2");
  await expect(page.getByTestId("lesson")).toHaveCount(0);
  await expect(page.locator('[data-lesson="u1-1"]')).toHaveAttribute("data-state", "current");
});

for (const [id, name] of [
  ["u4-1", "dots"],
  ["u5-4", "book"],
  ["u6-2", "shapes"],
  ["u7-1", "vowels"],
  ["u3-5", "review"],
] as const) {
  test(`the ${name} lesson plays through`, async ({ page }) => {
    await seed(page, id);
    await page.goto("/learn");
    await expect(page.locator(`[data-lesson="${id}"]`)).toHaveAttribute("data-state", "current");
    await page.goto(`/learn#/lesson/${id}`);
    await noSideScroll(page);
    const kinds = await play(page, { shots: name, mistake: name === "book" });
    if (name === "book") expect(kinds.has("find")).toBe(true);
    await expect(page.getByTestId("lesson-done")).toBeVisible();
  });
}

test("practice waits until the first lesson is done", async ({ page }) => {
  await seed(page);
  await page.goto("/learn#/review");
  await expect(page.getByRole("heading", { name: "Practice opens after your first lesson" })).toBeVisible();
});

test("practice strengthens weak letters", async ({ page }) => {
  await seed(page, "u2-1");
  await page.goto("/learn#/review");
  await expect(page.getByRole("heading", { name: "Practise your trickiest letters" })).toBeVisible();
  await shot(page, "review");
  await page.getByTestId("start-review").click();
  await play(page);
  await expect(page.getByRole("heading", { name: "Practice complete!" })).toBeVisible();
});

test("the profile shows letters, badges and lets a family add a second learner", async ({ page }) => {
  await seed(page, "u2-1");
  await page.goto("/learn#/me");
  await expect(page.getByRole("heading", { name: "My letters" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Alif, strength/ })).toBeVisible();
  await expect(page.getByText("Lessons done")).toBeVisible();
  await noSideScroll(page);
  await shot(page, "profile");

  await page.getByRole("button", { name: "Switch learner", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Who’s learning?" })).toBeVisible();
  await page.getByRole("button", { name: "Add a learner" }).click();
  await page.getByLabel("Learner’s nickname").fill("Yusuf");
  await page.getByRole("button", { name: "Add learner" }).click();
  await expect(page.getByText("Assalamu alaikum, Yusuf!")).toBeVisible();
  await expect(page.locator('[data-lesson="u1-1"]')).toHaveAttribute("data-state", "current");

  await page.getByRole("button", { name: /Learning as Yusuf/ }).click();
  await page.getByRole("button", { name: /^Test/ }).click();
  await expect(page.locator('[data-lesson="u2-1"]')).toHaveAttribute("data-state", "current");
});
