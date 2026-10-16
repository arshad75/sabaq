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

  await student.getByTestId("qaida-page").click({ position: { x: 100, y: 200 } });
  await expect(teacher.getByRole("img", { name: "Current position" })).toBeVisible({ timeout: 1500 });

  await teacher.getByTestId("qaida-page").click({ position: { x: 150, y: 150 } });
  await teacher.getByRole("dialog", { name: "Mark this word" }).getByRole("button", { name: /Pronounce/ }).click();
  await expect(student.getByRole("img", { name: "Mark: Pronunciation" })).toBeVisible({ timeout: 1500 });

  await student.getByRole("button", { name: "Next page" }).click();
  await expect(teacher.getByRole("img", { name: "Noorani Qaida page 2" })).toBeVisible({ timeout: 1500 });

  await context.close();
});

test("join form rejects a malformed code", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Room code").fill("AB1");
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByText(/6 characters/)).toBeVisible();
});
