import { expect, test, type Page } from "@playwright/test";
import { LESSONS } from "../src/lib/learn/curriculum";

export const KEY = "sabaq:learn";

/** Saves a learner who has finished every lesson before `lessonId`. */
export async function seed(page: Page, lessonId?: string) {
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

export async function shot(page: Page, name: string) {
  if (!process.env.SHOTS) return;
  await page.screenshot({ path: `${process.env.SHOTS}/${test.info().project.name}-${name}.png` });
}

/** Plays the open lesson to the end. Gets the first graded question wrong if asked to. */
export async function play(page: Page, { mistake = false, shots = "" } = {}) {
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
    } else if (await main.locator("[data-step]").count()) {
      kinds.add("order");
      if (shots && !kinds.has("shot-order")) {
        kinds.add("shot-order");
        await shot(page, `${shots}-order`);
      }
      const n = await main.locator("[data-step]").count();
      for (let i = 0; i < n; i++) await main.locator(`[data-step="${i}"]`).click();
    } else {
      kinds.add("info");
      if (shots && step === 0) await shot(page, `${shots}-intro`);
    }
    await page.getByRole("button", { name: /^(Continue|I said it)$/ }).click();
  }
  throw new Error("lesson did not finish");
}

/** Serves obviously fake word data for the Quran lessons and keeps their audio off the network. */
export async function mockQuranWords(page: Page) {
  await page.route("**/api/quran/*/words", (route) => {
    const surah = Number(new URL(route.request().url()).pathname.split("/")[3]);
    const counts = surah === 1 ? [4, 4, 2, 3, 4, 3, 9] : [4, 3, 5, 4, 5];
    const verses = counts.map((n, i) => {
      const key = `${surah}:${i + 1}`;
      return {
        key,
        number: i + 1,
        text: `[ayah ${key}]`,
        words: Array.from({ length: n }, (_, p) => ({
          id: `${key}:${p + 1}`,
          position: p + 1,
          text: `[w${i + 1}.${p + 1}]`,
          audio: `https://verses.quran.foundation/wbw/test_${i}_${p}.mp3`,
        })),
      };
    });
    return route.fulfill({ json: { verses } });
  });
  await page.route(/^https:\/\/(verses\.quran\.foundation\/wbw|everyayah\.com)\//, (route) => route.abort());
}

export async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
