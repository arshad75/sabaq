import { expect, test } from "@playwright/test";
import { generateRoomCode } from "../src/lib/session/room-code";

// Two separate browser contexts share nothing locally, so these only pass over Supabase Realtime.
test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "needs NEXT_PUBLIC_SUPABASE_URL (pnpm db:start)");

test("two devices sync over Supabase Realtime, including after a dropped connection", async ({ browser }) => {
  const code = generateRoomCode();
  const teacherDevice = await browser.newContext();
  const studentDevice = await browser.newContext();
  const teacher = await teacherDevice.newPage();
  const student = await studentDevice.newPage();

  await teacher.goto(`/session/${code}?role=teacher`);
  await student.goto(`/session/${code}?role=student`);
  await expect(teacher.getByRole("status", { name: "Student: Connected" })).toBeVisible({ timeout: 15_000 });

  await student.locator('[data-word="1:2:3"]').click();
  await expect(teacher.locator('[data-word="1:2:3"]')).toHaveAttribute("aria-label", /current position/, {
    timeout: 3000,
  });

  await teacher.locator('[data-word="1:1:2"]').click();
  await teacher.getByRole("dialog", { name: "Mark this word" }).getByRole("button", { name: /Tajweed/ }).click();
  await expect(student.locator('[data-word="1:1:2"]')).toHaveAttribute("aria-label", /marked Tajweed rule/, {
    timeout: 3000,
  });

  await studentDevice.setOffline(true);
  await student.getByRole("button", { name: "Next page" }).click();
  await studentDevice.setOffline(false);
  await expect(teacher.getByRole("article", { name: "Page 2" })).toBeVisible({ timeout: 20_000 });

  await teacherDevice.close();
  await studentDevice.close();
});
