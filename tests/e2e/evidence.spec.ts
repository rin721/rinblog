import { expect, test } from "@playwright/test";
import { capture, viewports } from "./evidence";

test.describe("分区页面视觉证据", () => {
	for (const [name, viewport] of Object.entries(viewports)) {
		test(`${name} 下日记与图片页面`, async ({ page }) => {
			await page.setViewportSize(viewport);
			await page.goto("/diary/");
			await capture(page, name, "diary-zh");
			await page.goto("/images/");
			await capture(page, name, "images-zh");
			await page.goto("/en/images/");
			await capture(page, name, "images-en");
			await page.goto("/friends/");
			await capture(page, name, "friends-zh");
		});
	}

	test("深色主题下图片页面", async ({ page }) => {
		await page.setViewportSize(viewports.desktop);
		await page.goto("/images/");
		await page.evaluate(() => {
			localStorage.setItem("theme", "dark");
			document.documentElement.classList.add("dark");
		});
		await expect(page.locator("html")).toHaveClass(/dark/);
		await capture(page, "dark", "images-zh");
		await page.goto("/friends/");
		await capture(page, "dark", "friends-zh");
	});
});
