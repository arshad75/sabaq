import { expect, test } from "@playwright/test";

test("landing demo: a tap on the tablet reaches the teacher's phone, and the teacher's mark comes back", async ({ page }) => {
  await page.goto("/");
  const demo = page.getByRole("region", { name: "Try it right here" });
  await demo.getByRole("button", { name: "Line 3, word 2" }).click();
  await expect(demo.getByText("The teacher sees line 3, box 2.")).toBeVisible();

  await demo.getByRole("button", { name: "Tajweed" }).click();
  await expect(demo.getByRole("button", { name: /Line 3, word 2, current position, marked Tajweed rule/ })).toBeVisible();

  await demo.getByRole("button", { name: "Start again" }).click();
  await expect(demo.getByRole("button", { name: /marked/ })).toHaveCount(0);
});
