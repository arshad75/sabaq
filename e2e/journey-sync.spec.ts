import { expect, test } from "@playwright/test";
import { play } from "./learn-helpers";

// Real accounts against a Supabase stack. Uses the email fallback, since Google can't be automated.
test.skip(process.env.NEXT_PUBLIC_SUPABASE_AUTH !== "1", "needs NEXT_PUBLIC_SUPABASE_AUTH=1 and Supabase");

test("a family's journey is saved to their account and follows them to another device", async ({ browser }, info) => {
  test.setTimeout(90_000);
  const email = `journey-${Date.now()}-${info.project.name}@example.com`;

  const tablet = await (await browser.newContext()).newPage();
  await tablet.goto("/signup");
  await tablet.getByLabel("Your first name").fill("Maryam");
  await tablet.getByLabel("Email").fill(email);
  await tablet.getByLabel("Password").fill("a-good-password");
  await tablet.getByRole("button", { name: "Create account" }).click();
  await expect(tablet.getByRole("heading", { name: "Assalamu alaikum, Maryam" })).toBeVisible();
  await tablet.getByRole("link", { name: "Start learning" }).click();

  await tablet.getByLabel("What shall we call you?").fill("Zaynab");
  await tablet.getByRole("button", { name: "Start learning" }).click();
  await expect(tablet.getByTestId("sync-status")).toHaveText(/Saved to Maryam’s account/);
  await tablet.getByRole("button", { name: "Begin · +10 Noor" }).click();
  await play(tablet);
  for (let i = 0; i < 3 && (await tablet.getByTestId("lesson-done").isVisible()); i++) {
    await tablet.getByRole("button", { name: "Continue" }).click();
  }
  await expect(tablet.getByTestId("xp")).toHaveAccessibleName("15 Noor");
  await expect(tablet.getByTestId("sync-status")).toHaveText(/Saved to Maryam’s account/);

  // A second device: nothing stored locally, the account brings the journey back.
  const phone = await (await browser.newContext()).newPage();
  await phone.goto("/login?email=1");
  await phone.getByRole("textbox", { name: "Email" }).fill(email);
  await phone.locator("#password").fill("a-good-password");
  await phone.getByRole("button", { name: "Log in" }).click();
  await expect(phone.getByRole("heading", { name: "Assalamu alaikum, Maryam" })).toBeVisible();
  const card = phone.locator("section", { has: phone.getByRole("heading", { name: "Zaynab" }) });
  await expect(card.getByText("Noor")).toBeVisible();
  await expect(card.getByText("15", { exact: true })).toBeVisible();
  await card.getByRole("link", { name: "Open journey" }).click();
  await expect(phone.getByTestId("xp")).toHaveAccessibleName("15 Noor");
  await expect(phone.locator('[data-lesson="u1-1"]')).toHaveAttribute("data-state", "done");
  await expect(phone.locator('[data-lesson="u1-2"]')).toHaveAttribute("data-state", "current");

  // Signing out leaves nothing of the family's journey on a shared device.
  await phone.goto("/account");
  await phone.getByRole("button", { name: /log out|sign out/i }).first().click();
  await phone.goto("/learn");
  await expect(phone.getByRole("heading", { name: "Learn to read, one letter at a time" })).toBeVisible();
});
