import { expect, test } from "@playwright/test";

// Real accounts against a Supabase stack (pnpm db:start). The seed makes sara@example.com an admin.
test.skip(process.env.NEXT_PUBLIC_SUPABASE_AUTH !== "1", "needs NEXT_PUBLIC_SUPABASE_AUTH=1 and Supabase");

test("a parent signs up and asks for a lesson; the admin schedules it with a teacher", async ({ browser }, info) => {
  // The whole journey across four devices; the dev server compiles pages on first use.
  test.setTimeout(90_000);
  const email = `parent-${Date.now()}-${info.project.name}@example.com`;
  const child = `Ayaan-${info.project.name}-${Date.now().toString(36).slice(-5)}`;
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

  await parent.getByLabel("Your child’s first name or nickname").fill(child);
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
  await expect(card.getByText("scheduled", { exact: true })).toBeVisible({ timeout: 15_000 });

  await parent.reload();
  await expect(parent.getByText(/Sat 5pm Sydney with Ustadha Amina/)).toBeVisible();

  // Onboard, then a real lesson: teacher and child on separate devices, saved at the end.
  await card.getByRole("button", { name: "Onboard" }).click();
  await expect(card.getByText("Onboarded: linked to the teacher")).toBeVisible({ timeout: 15_000 });

  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto("/login");
  await teacher.getByRole("textbox", { name: "Email" }).fill("amina@example.com");
  await teacher.locator("#password").fill("sabaq-demo");
  await teacher.getByRole("button", { name: "Log in" }).click();
  const row = teacher.getByRole("listitem").filter({ hasText: child });
  await row.getByRole("button", { name: "Start lesson" }).click();
  const code = (await row.locator("p.font-mono").innerText()).trim();
  await row.getByRole("link", { name: "Open live view" }).click();
  await expect(teacher.getByRole("img", { name: "Noorani Qaida page 1" })).toBeVisible();

  const tablet = await (await browser.newContext()).newPage();
  await tablet.goto("/join");
  await tablet.getByRole("textbox", { name: "Room code" }).fill(code);
  await tablet.getByRole("button", { name: "Join session" }).click();
  await expect(teacher.getByRole("status", { name: "Student: Connected" })).toBeVisible({ timeout: 15_000 });

  await teacher.getByRole("button", { name: /^Line 2, word 2\b/ }).click();
  await teacher.getByRole("dialog").getByRole("button", { name: /Tajweed/ }).click();
  await expect(tablet.getByRole("img", { name: "Mark: Tajweed rule (#1)" })).toBeVisible({ timeout: 5000 });
  await teacher.getByRole("button", { name: "End session" }).click();
  await teacher.getByRole("button", { name: "Yes, end" }).click();
  await teacher.getByRole("button", { name: "Save and view summary" }).click();
  await expect(teacher).toHaveURL(/\/lessons\/[0-9a-f-]{36}$/);
  await expect(teacher.getByRole("heading", { name: `${child} · Qaida` })).toBeVisible();
  await expect(teacher.getByText("Line 2, box 2")).toBeVisible();

  await parent.reload();
  await parent.getByRole("link", { name: /page 1\s+1 mark/ }).click();
  await expect(parent.getByRole("heading", { name: `${child} · Qaida` })).toBeVisible();
  await expect(parent.getByText(/· with Ustadha Amina/).filter({ visible: true })).toBeVisible();
  await expect(parent.getByRole("img", { name: "Mark: Tajweed rule (#1)" })).toBeVisible();

  // Teacher sets homework on the child's page; the parent sees it with badges and stars.
  await teacher.goto("/welcome");
  await teacher.getByRole("link", { name: child }).click();
  await expect(teacher.getByRole("heading", { name: child, level: 1 })).toBeVisible();
  await teacher.getByLabel("Qaida page from").fill("3");
  await teacher.getByLabel("to page").fill("4");
  await teacher.getByLabel("Note for the family (optional)").fill("Three times each line");
  await teacher.getByRole("button", { name: "Set homework" }).click();
  await expect(teacher.getByText("Homework set.")).toBeVisible({ timeout: 15_000 });

  await parent.goto("/welcome");
  await parent.getByRole("link", { name: "Progress & badges" }).click();
  await expect(parent.getByRole("heading", { name: child, level: 1 })).toBeVisible();
  await expect(parent.getByText(/New lesson: Qaida pages 3–4/)).toBeVisible();
  await expect(parent.getByText("First lesson", { exact: true })).toBeVisible();
  await expect(parent.getByRole("list", { name: "Rewards" })).toContainText("1 lesson");

  // Privacy: the parent can download everything, then delete the child.
  const exported = await parent.request.get("/account/export");
  expect(exported.headers()["content-disposition"]).toContain("sabaq-export-");
  const data = await exported.json();
  expect(data.children.map((c: { nickname: string }) => c.nickname)).toContain(child);
  expect(data.lessons).toHaveLength(1);

  await parent.getByLabel(/Type delete to confirm/).fill("delete");
  await expect(parent.getByRole("button", { name: `Delete ${child}’s data` })).toBeEnabled();
  await parent.getByLabel(/Type delete to confirm/).press("Enter");
  await expect(parent).toHaveURL(/\/welcome$/);
  await expect(parent.getByRole("link", { name: "Progress & badges" })).toHaveCount(0);

  await parent.goto("/account");
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
