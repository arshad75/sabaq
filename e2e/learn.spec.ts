import { expect, test, type Page } from "@playwright/test";
import { LESSONS } from "../src/lib/learn/curriculum";

const KEY = "sabaq:learn";

/** Saves a learner who has finished every lesson before `lessonId`. */
async function seed(page: Page, lessonId?: string) {
  const before = lessonId ? LESSONS.slice(0, LESSONS.findIndex((l) => l.id === lessonId)) : [];
  const lessons = Object.fromEntries(before.map((l) => [l.id, { stars: 3, best: 1, plays: 1, last: "2026-01-01" }]));
  const store = {
    version: 1,
    active: "t1",
    learners: [{ id: "t1", name: "Test", color: "sky" }],
    data: { t1: { xp: 0, days: {}, lessons, items: {}, goal: 20, badges: {} } },
  };
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    [KEY, JSON.stringify(store)],
  );
}

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS) return;
  await page.screenshot({ path: `${process.env.SHOTS}/${test.info().project.name}-${name}.png` });
}

/** Plays the open lesson to the end. Gets the first graded question wrong if asked to. */
async function play(page: Page, { mistake = false, shots = "" } = {}) {
  const lesson = page.getByTestId("lesson");
  const kinds = new Set<string>();
  let wrong = mistake;
  for (let step = 0; step < 80; step++) {
    if (await page.getByTestId("lesson-done").isVisible()) return kinds;
    const main = lesson.locator("main");
    const asked = main.locator("[data-answer]");
    if (await asked.count()) {
      const answer = (await asked.first().getAttribute("data-answer"))!;
      const options = main.locator("[data-option]");
      if (await options.count()) {
        kinds.add("choice");
        let pick = answer;
        if (wrong) {
          const ids = await options.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.option!));
          pick = ids.find((id) => id !== answer)!;
        }
        await main.locator(`[data-option="${pick}"]`).click();
      } else {
        kinds.add("find");
        if (shots && !kinds.has("shot-find")) {
          kinds.add("shot-find");
          await shot(page, `${shots}-find`);
        }
        const target = wrong ? main.locator(`[data-letter]:not([data-letter="${answer}"])`) : main.locator(`[data-letter="${answer}"]`);
        await target.first().click();
      }
      await page.getByRole("button", { name: "Check" }).click();
      if (wrong) {
        await expect(page.getByText(/Not quite|shown in green/).first()).toBeVisible();
        if (shots) await shot(page, `${shots}-wrong`);
        wrong = false;
      } else if (shots && !kinds.has("shot-right")) {
        kinds.add("shot-right");
        await shot(page, `${shots}-right`);
      }
    } else if (await main.locator("[data-match]").count()) {
      kinds.add("match");
      const ids = await main.locator('[data-match^="g:"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.match!.slice(2)));
      for (const id of ids) {
        await main.locator(`[data-match="g:${id}"]`).click();
        await main.locator(`[data-match="n:${id}"]`).click();
      }
    } else {
      kinds.add("info");
      if (shots && step === 0) await shot(page, `${shots}-intro`);
    }
    await page.getByRole("button", { name: "Continue" }).click();
  }
  throw new Error("lesson did not finish");
}

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

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
  await expect(page.getByText("Finish the lessons before this to unlock it.")).toBeVisible();
  await page.locator('[data-lesson="u1-1"]').click();
  await page.getByRole("button", { name: "Start +10 XP" }).click();
  await expect(page.getByText("New letter")).toBeVisible();
  await noSideScroll(page);

  const kinds = await play(page, { shots: "l1" });
  expect([...kinds]).toEqual(expect.arrayContaining(["info", "choice", "match"]));

  await expect(page.getByRole("heading", { name: "Perfect lesson!" })).toBeVisible();
  await expect(page.getByLabel("3 of 3 stars")).toBeVisible();
  await expect(page.getByText("+15")).toBeVisible();
  await shot(page, "done");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "day streak!" })).toBeVisible();
  await shot(page, "streak");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("First step")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.locator('[data-lesson="u1-1"]')).toHaveAttribute("data-state", "done");
  await expect(page.locator('[data-lesson="u1-2"]')).toHaveAttribute("data-state", "current");
  await expect(page.getByTestId("streak")).toHaveAccessibleName("1 day streak");
  await expect(page.getByTestId("xp")).toHaveAccessibleName("15 XP");

  await page.reload();
  await expect(page.getByTestId("xp")).toHaveAccessibleName("15 XP");
  await expect(page.locator('[data-lesson="u1-2"]')).toHaveAttribute("data-state", "current");
});

test("a mistake is corrected, asked again, and costs a star", async ({ page }) => {
  await seed(page);
  await page.goto("/learn#/lesson/u1-1");
  await play(page, { mistake: true, shots: "mistake" });
  await expect(page.getByRole("heading", { name: "Lesson complete!" })).toBeVisible();
  await expect(page.getByLabel("2 of 3 stars")).toBeVisible();
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
  await expect(page.getByTestId("xp")).toHaveAccessibleName("0 XP");
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
