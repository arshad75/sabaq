import { expect, test, type Browser, type Page } from "@playwright/test";

// Prototype demo logins; accounts.spec.ts covers real accounts.
test.skip(process.env.NEXT_PUBLIC_SUPABASE_AUTH === "1", "prototype logins only");

// These tests share one server (and its in-memory auth state) across all viewports,
// so they only use the default PIN for Maryam and never lock or reset anyone.

async function parentLogIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("sara@example.com");
  await page.getByText("Password", { exact: true }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("sabaq-demo");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Assalamu alaikum, Sara" })).toBeVisible();
}

async function freshPage(browser: Browser) {
  return (await browser.newContext()).newPage();
}

test("teacher: wrong password shows a generic error, right password opens the teacher dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("amina@example.com");
  await page.getByText("Password", { exact: true }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("That email and password don’t match.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Password" })).toBeChecked();

  await page.getByRole("textbox", { name: "Password" }).fill("sabaq-demo");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  await expect(page.getByRole("heading", { name: "Assalamu alaikum, Ustadha Amina" })).toBeVisible();
});

test("email link login never reveals whether an account exists", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("nobody@example.com");
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText(/If nobody@example.com has an account/)).toBeVisible();
});

test("student: an unpaired tablet lists no children", async ({ browser }) => {
  const page = await freshPage(browser);
  await page.goto("/login/student");
  await expect(page.getByRole("heading", { name: "This tablet isn’t set up yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Maryam/ })).toHaveCount(0);
});

test("parent-only tablet setup is refused without a parent session", async ({ browser }) => {
  const page = await freshPage(browser);
  await page.goto("/guardian/children/s1");
  await page.getByRole("button", { name: "Set up this tablet" }).click();
  await expect(page.getByText("Log in as the parent or guardian first.")).toBeVisible();
});

test("student: parent sets up the tablet, child picks her name and signs in with a PIN", async ({ browser }) => {
  const page = await freshPage(browser);
  await parentLogIn(page);
  await page.goto("/guardian/children/s1");
  await page.getByRole("button", { name: "Set up this tablet" }).click();
  await expect(page.getByRole("heading", { name: "Who is reading?" })).toBeVisible();

  await page.getByRole("button", { name: /Maryam/ }).click();
  for (const d of "1234") await page.getByRole("button", { name: d, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Assalamu alaikum, Maryam!" })).toBeVisible();

  // A child's session can't use parent-only actions.
  await page.goto("/guardian/children/s1");
  await page.getByRole("button", { name: "Set up this tablet" }).click();
  await expect(page.getByText("Log in as the parent or guardian first.")).toBeVisible();
});

test("student: a one-time link signs the child in once, then shows it as used", async ({ browser }) => {
  const parent = await freshPage(browser);
  await parentLogIn(parent);
  await parent.goto("/guardian/children/s2");
  await parent.getByRole("button", { name: "Create sign-in link" }).click();
  const link = await parent.locator("p.font-mono").filter({ visible: true }).innerText();

  const tablet = await freshPage(browser);
  await tablet.goto(link);
  await tablet.getByRole("button", { name: "Start" }).click();
  await expect(tablet.getByRole("heading", { name: "Assalamu alaikum, Yusuf!" })).toBeVisible();

  await tablet.goto(link);
  await tablet.getByRole("button", { name: "Start" }).click();
  await expect(tablet.getByText(/used or has expired/)).toBeVisible();
});

test("sign out ends the session", async ({ page }) => {
  await parentLogIn(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/guardian/children/s1");
  await page.getByRole("button", { name: "Set up this tablet" }).click();
  await expect(page.getByText("Log in as the parent or guardian first.")).toBeVisible();
});
