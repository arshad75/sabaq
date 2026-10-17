import { expect, test, type Page } from "@playwright/test";

// Records every utterance and clip for the whole test, across page loads.
async function recordSounds(page: Page) {
  await page.addInitScript(() => {
    const log = (s: string) => sessionStorage.setItem("sounds", JSON.stringify([...JSON.parse(sessionStorage.getItem("sounds") ?? "[]"), s]));
    const synth = window.speechSynthesis;
    if (synth) {
      const speak = synth.speak.bind(synth);
      synth.speak = (u: SpeechSynthesisUtterance) => {
        log(`speak:${u.lang}:${u.text}`);
        speak(u);
      };
    }
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      log(`clip:${new URL(this.src).pathname}`);
      return play.call(this);
    };
  });
}

const sounds = (page: Page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("sounds") ?? "[]") as string[]);

/** Only Arabic letter names may be heard: a device Arabic voice or a bundled letter clip. */
const isLetter = (s: string) => /^speak:ar/.test(s) || s.startsWith("clip:/audio/letters/");

test("buttons and links never speak their labels", async ({ page }) => {
  await recordSounds(page);
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Learn" }).click();
  await page.getByLabel("What shall we call you?").fill("Quiet");
  await page.getByRole("button", { name: "Start learning" }).click();
  const tabs = page.getByRole("navigation", { name: "Learning" });
  for (const tab of ["Practise", "Me", "Learn"]) await tabs.getByRole("link", { name: tab }).click();
  await page.locator('[data-lesson="u1-2"]').click();
  await page.getByRole("button", { name: /Switch learner/ }).click();

  await page.goto("/practice");
  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("button", { name: "Previous page" }).click();
  await page.goto("/join");
  await page.getByRole("button", { name: "Join session" }).click();
  await page.goto("/login");
  // The demo login screen differs from the real one; press whichever log-in button is there.
  const logIn = page.getByRole("button", { name: /log in/i }).first();
  if (await logIn.count()) await logIn.click();
  await page.goto("/listen");
  await page.waitForTimeout(1200);
  expect(await sounds(page)).toEqual([]);
});

test("tapping a letter says its Arabic name, and nothing else", async ({ page }) => {
  await recordSounds(page);
  await page.goto("/practice");
  await page.getByRole("button", { name: "Line 2, word 2" }).click();
  await expect.poll(() => sounds(page)).not.toEqual([]);
  await page.waitForTimeout(1200);
  const heard = await sounds(page);
  expect(heard.filter((s) => !isLetter(s))).toEqual([]);
  expect(heard.some((s) => s.includes("باء") || s.endsWith("/ba.mp3"))).toBe(true);
});

test("a lesson only ever says the letters being learned", async ({ page }) => {
  await recordSounds(page);
  await page.goto("/learn");
  await page.getByLabel("What shall we call you?").fill("Listener");
  await page.getByRole("button", { name: "Start learning" }).click();
  await page.locator('[data-lesson="u1-1"]').click();
  await page.getByRole("button", { name: "Start +10 XP" }).click();
  await expect(page.getByText("New letter")).toBeVisible();

  const main = page.getByTestId("lesson").locator("main");
  for (let i = 0; i < 6; i++) {
    const asked = main.locator("[data-answer]");
    if (await asked.count()) {
      const answer = await asked.first().getAttribute("data-answer");
      await main.locator(`[data-option="${answer}"]`).click();
      await page.getByRole("button", { name: "Check" }).click();
    }
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("button", { name: "Quit lesson" }).click();
  await page.getByRole("button", { name: "Keep learning" }).click();
  await page.waitForTimeout(1200);

  const heard = await sounds(page);
  expect(heard.length).toBeGreaterThan(0);
  expect(heard.filter((s) => !isLetter(s))).toEqual([]);
});
