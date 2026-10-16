import { expect, test, type Page } from "@playwright/test";
import { generateRoomCode } from "../src/lib/session/room-code";

const word = (page: Page, key: string) => page.locator(`[data-word="${key}"]`);

test("student position and teacher marks sync both ways and survive a refresh", async ({ browser }) => {
  const code = generateRoomCode();
  const context = await browser.newContext();
  const teacher = await context.newPage();
  const student = await context.newPage();

  await teacher.goto(`/session/${code}?role=teacher`);
  await student.goto(`/session/${code}?role=student`);
  await expect(teacher.getByRole("status", { name: "Student: Connected" })).toBeVisible({ timeout: 10_000 });

  await word(student, "1:2:3").click();
  await expect(word(teacher, "1:2:3")).toHaveAttribute("aria-label", /current position/, { timeout: 1500 });

  await word(teacher, "1:1:2").click();
  await teacher.getByRole("dialog", { name: "Mark this word" }).getByRole("button", { name: /Tajweed/ }).click();
  await expect(word(student, "1:1:2")).toHaveAttribute("aria-label", /marked Tajweed rule/, { timeout: 1500 });

  await student.reload();
  await expect(word(student, "1:1:2")).toHaveAttribute("aria-label", /marked Tajweed rule/);
  await expect(word(student, "1:2:3")).toHaveAttribute("aria-label", /current position/);

  await context.close();
});

test("teacher follows the student's page and can stop following", async ({ browser }) => {
  const code = generateRoomCode();
  const context = await browser.newContext();
  const teacher = await context.newPage();
  const student = await context.newPage();
  await teacher.goto(`/session/${code}?role=teacher`);
  await student.goto(`/session/${code}?role=student`);

  await student.getByRole("button", { name: "Next page" }).click();
  await expect(teacher.getByRole("article", { name: "Page 2" })).toBeVisible({ timeout: 1500 });

  await teacher.getByRole("button", { name: /Following student/ }).click();
  await student.getByRole("button", { name: "Next page" }).click();
  await expect(teacher.getByText("Student is on page 3.")).toBeVisible({ timeout: 1500 });
  await expect(teacher.getByRole("article", { name: "Page 2" })).toBeVisible();

  await context.close();
});

test("ending the session shows the ended state on both sides", async ({ browser }) => {
  const code = generateRoomCode();
  const context = await browser.newContext();
  const teacher = await context.newPage();
  const student = await context.newPage();
  await teacher.goto(`/session/${code}?role=teacher`);
  await student.goto(`/session/${code}?role=student`);

  await teacher.getByRole("button", { name: "End session" }).click();
  await teacher.getByRole("button", { name: "Yes, end" }).click();
  await expect(teacher.getByRole("heading", { name: "Session ended" })).toBeVisible();
  await expect(student.getByRole("heading", { name: "Session ended" })).toBeVisible({ timeout: 1500 });

  await context.close();
});

test("qaida: student points at a spot and teacher marks it on the page image", async ({ browser }) => {
  const code = generateRoomCode();
  const context = await browser.newContext();
  const teacher = await context.newPage();
  const student = await context.newPage();
  // Only the teacher's link names the book; the student learns it through sync.
  await teacher.goto(`/session/${code}?role=teacher&book=qaida`);
  await student.goto(`/session/${code}?role=student`);
  await expect(student.getByRole("img", { name: "Noorani Qaida page 1" })).toBeVisible({ timeout: 5000 });

  // Page 1, line 2 is the first row of the letter grid; word 1 is its rightmost letter.
  await student.getByRole("button", { name: /^Line 2, word 1\b/ }).click();
  await expect(teacher.getByRole("button", { name: "Line 2, word 1, current position" })).toBeVisible({ timeout: 1500 });

  await student.getByRole("button", { name: /^Line 2, word 2\b/ }).click();
  await expect(teacher.getByRole("button", { name: "Line 2, word 2, current position" })).toBeVisible({ timeout: 1500 });
  await expect(teacher.getByRole("button", { name: "Line 2, word 1", exact: true })).toBeVisible();

  await teacher.getByRole("button", { name: /^Line 3, word 3\b/ }).click();
  await teacher.getByRole("dialog", { name: "Mark this word" }).getByRole("button", { name: /Pronounce/ }).click();
  await expect(student.getByRole("button", { name: /^Line 3, word 3, marked Pronunciation/ })).toBeVisible({ timeout: 1500 });
  await expect(student.getByRole("img", { name: "Mark: Pronunciation (#1)" })).toBeVisible();

  await student.getByRole("button", { name: "Next page" }).click();
  await expect(teacher.getByRole("img", { name: "Noorani Qaida page 2" })).toBeVisible({ timeout: 1500 });

  await context.close();
});

test("after a dropped connection the teacher catches up with what the student did offline", async ({ browser }) => {
  // Simulates the drop by stubbing BroadcastChannel; realtime.spec.ts covers drops over Supabase.
  test.skip(!!process.env.NEXT_PUBLIC_SUPABASE_URL, "same-browser transport only");
  const code = generateRoomCode();
  const context = await browser.newContext();
  const errors: string[] = [];
  const teacher = await context.newPage();
  const student = await context.newPage();
  for (const p of [teacher, student]) p.on("pageerror", (e) => errors.push(e.message));
  await teacher.goto(`/session/${code}?role=teacher&book=qaida&latency=300`);
  await student.goto(`/session/${code}?role=student&latency=300`);
  await expect(teacher.getByRole("status", { name: "Student: Connected" })).toBeVisible({ timeout: 8000 });

  // The student's outgoing messages are lost, as on a dropped mobile connection.
  await student.evaluate(() => {
    const w = window as unknown as { realPost: typeof BroadcastChannel.prototype.postMessage };
    w.realPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = () => {};
  });
  await expect(teacher.getByText(/connection dropped/)).toBeVisible({ timeout: 12_000 });
  await student.getByRole("button", { name: "Next page" }).click();
  await expect(student.getByRole("img", { name: "Noorani Qaida page 2" })).toBeVisible();

  await student.evaluate(() => {
    BroadcastChannel.prototype.postMessage = (window as unknown as { realPost: typeof BroadcastChannel.prototype.postMessage }).realPost;
  });
  await expect(teacher.getByRole("status", { name: "Student: Connected" })).toBeVisible({ timeout: 8000 });
  await expect(teacher.getByRole("img", { name: "Noorani Qaida page 2" })).toBeVisible({ timeout: 3000 });

  await student.close();
  await teacher.waitForTimeout(500);
  expect(errors).toEqual([]);
  await context.close();
});

test("full qaida lesson: numbered marks, select from list, end, save and open its real summary", async ({ browser }) => {
  const teacherCtx = await browser.newContext();
  const teacher = await teacherCtx.newPage();
  await teacher.goto("/login");
  await teacher.getByRole("textbox", { name: "Email" }).fill("amina@example.com");
  await teacher.getByText("Password", { exact: true }).click();
  await teacher.getByRole("textbox", { name: "Password" }).fill("sabaq-demo");
  await teacher.getByRole("button", { name: "Log in" }).click();
  await expect(teacher).toHaveURL(/\/teacher$/);
  await teacher.getByLabel("Student").selectOption({ label: "Sumayya" });
  await teacher.getByRole("button", { name: "Start a session" }).click();
  const code = (await teacher.locator("p.font-mono").filter({ visible: true }).first().innerText()).trim();
  await teacher.getByRole("button", { name: "Open live view" }).click();
  await expect(teacher.getByRole("img", { name: "Noorani Qaida page 1" })).toBeVisible();

  // Same browser context so the local transport connects the two tabs.
  const student = await teacherCtx.newPage();
  await student.goto("/join");
  await student.getByRole("textbox", { name: "Room code" }).fill(code);
  await student.getByRole("button", { name: "Join session" }).click();
  await expect(student.getByRole("img", { name: "Noorani Qaida page 1" })).toBeVisible();

  await teacher.getByRole("button", { name: /^Line 2, word 2\b/ }).click();
  await teacher.getByRole("dialog").getByRole("button", { name: /Tajweed/ }).click();
  await teacher.getByRole("button", { name: /^Line 2, word 3\b/ }).click();
  await teacher.getByRole("dialog").getByRole("button", { name: /Good/ }).click();
  await expect(student.getByRole("img", { name: "Mark: Tajweed rule (#1)" })).toBeVisible();
  await expect(student.getByRole("img", { name: "Mark: Good (#2)" })).toBeVisible();

  // Selecting #1 from the list opens that exact mark; change it to Slip.
  const showPanel = teacher.getByRole("button", { name: "Show marks panel" });
  if (await showPanel.isVisible()) await showPanel.click();
  await teacher.getByRole("button", { name: /^Select mark #1/ }).click();
  await expect(teacher.getByRole("dialog")).toContainText("#1");
  await teacher.getByRole("dialog").getByRole("button", { name: /Slip/ }).click();
  await expect(student.getByRole("img", { name: "Mark: Memorisation slip (#1)" })).toBeVisible();
  await expect(teacher.locator("aside h2")).toHaveText("Marks (2)");

  await student.getByRole("button", { name: "Next page" }).click();
  await teacher.getByRole("button", { name: "End session" }).click();
  await teacher.getByRole("button", { name: "Yes, end" }).click();
  await teacher.getByRole("button", { name: "Save and view summary" }).click();
  await expect(teacher).toHaveURL(new RegExp(`/teacher/sessions/live-${code}-`));
  await expect(teacher.getByRole("heading", { name: "Session with Sumayya" })).toBeVisible();
  await expect(teacher.getByRole("link", { name: "#1 · p.1" })).toBeVisible();
  await expect(teacher.getByRole("link", { name: "#2 · p.1" })).toBeVisible();
  await expect(teacher.getByRole("img", { name: "Mark: Memorisation slip (#1)" })).toBeVisible();
  await expect(teacher.getByRole("navigation", { name: "Pages in this session" })).toContainText("2");

  await teacherCtx.close();
});

test("an unlinked room explains why it can't be saved", async ({ page }) => {
  await page.goto(`/session/${generateRoomCode()}?role=teacher&state=ended`);
  await expect(page.getByText(/isn’t linked to a student/)).toBeVisible();
});

test("join form rejects a malformed code", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Room code").fill("AB1");
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByText(/6 characters/)).toBeVisible();
});
