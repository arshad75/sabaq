import { expect, test } from "@playwright/test";

// Real accounts against a Supabase stack (pnpm db:start). The seed makes sara@example.com an admin.
test.skip(process.env.NEXT_PUBLIC_SUPABASE_AUTH !== "1", "needs NEXT_PUBLIC_SUPABASE_AUTH=1 and Supabase");

test("a parent signs up and asks for a lesson; the admin schedules it with a teacher", async ({ browser }, info) => {
  const email = `parent-${Date.now()}-${info.project.name}@example.com`;
  const parent = await (await browser.newContext()).newPage();

  await parent.goto("/signup");
  await parent.getByLabel("Your first name").fill("Hafsa");
  await parent.getByLabel("Email").fill(email);
  await parent.getByLabel("Password").fill("short");
  await parent.getByRole("button", { name: "Create account" }).click();
  await expect(parent.getByText("Use a password of at least 8 characters.")).toBeVisible();
  await parent.getByLabel("Password").fill("a-good-password");
  await parent.getByRole("button", { name: "Create account" }).click();
  await expect(parent.getByRole("heading", { name: "Assalamu alaikum, Hafsa" })).toBeVisible();

  await parent.getByLabel("Your child’s first name or nickname").fill("Ayaan");
  await parent.getByLabel("Which days and times suit you?").fill("Weekday evenings");
  await parent.getByRole("button", { name: "Ask for a first lesson" }).click();
  await expect(parent.getByText(/We’ll be in touch by email/)).toBeVisible();
  await expect(parent.getByRole("button", { name: "Ask for a first lesson" })).toHaveCount(0);

  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/login");
  await admin.getByRole("textbox", { name: "Email" }).fill("sara@example.com");
  await admin.locator("#password").fill("sabaq-demo");
  await admin.getByRole("button", { name: "Log in" }).click();
  await expect(admin).toHaveURL(/\/admin$/);
  const card = admin.locator("section section", { hasText: email });
  await card.getByLabel("Status").selectOption("scheduled");
  await card.getByLabel("When (shown to the family)").fill("Sat 5pm Sydney");
  await card.getByLabel("Teacher").selectOption({ label: "Ustadha Amina" });
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByText("scheduled", { exact: true })).toBeVisible();

  await parent.reload();
  await expect(parent.getByText(/Sat 5pm Sydney with Ustadha Amina/)).toBeVisible();

  await parent.getByRole("button", { name: "Log out" }).click();
  await expect(parent).toHaveURL(/\/login$/);
  await parent.getByRole("textbox", { name: "Email" }).fill(email);
  await parent.locator("#password").fill("wrong-password");
  await parent.getByRole("button", { name: "Log in" }).click();
  await expect(parent.getByText("That email and password don’t match.")).toBeVisible();
  await parent.locator("#password").fill("a-good-password");
  await parent.getByRole("button", { name: "Log in" }).click();
  await expect(parent).toHaveURL(/\/welcome$/);
});

test("demo-data screens and admin are closed to a parent", async ({ page }, info) => {
  await page.goto("/signup");
  await page.getByLabel("Your first name").fill("Musa");
  await page.getByLabel("Email").fill(`p2-${Date.now()}-${info.project.name}@example.com`);
  await page.getByLabel("Password").fill("a-good-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome$/);

  for (const path of ["/teacher", "/guardian", "/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/welcome$/);
  }
});
