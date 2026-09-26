import { expect, test } from "@playwright/test";

test.describe("分区页面与语言路由", () => {
	test("首页只呈现 home 内容且新分区链接可见", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
		await expect(page.locator("#navbar")).toContainText("Rin's Blog");
		await expect(page.locator('#navbar .hidden.md\\:flex a[href="/diary/"]')).toContainText("日记");
		await expect(page.locator('#navbar .hidden.md\\:flex a[href="/images/"]')).toContainText("图片");
		await expect(page.locator('#navbar .hidden.md\\:flex a[href="/friends/"]')).toContainText("朋友");
		await expect(page.locator("#sidebar #sections")).toHaveCount(0);
		await expect(page.locator("#pagination")).toHaveCount(0);
		await expect(
			page.locator('#content-wrapper a[href^="/posts/"]'),
		).toHaveCount(0);
	});

	test("中英文日记空状态与图片图库均正确显示", async ({ page }) => {
		for (const [path, message, lang] of [
			["/diary/", "这里还没有内容。", "zh-CN"],
			["/en/diary/", "Nothing here yet.", "en"],
		]) {
			await page.goto(path);
			await expect(page.locator("html")).toHaveAttribute("lang", lang);
			await expect(page.locator("#content-wrapper h1")).toHaveCount(0);
			await expect(page.locator("#content-wrapper").first()).toContainText(
				message,
			);
			await expect(page.locator("#navbar")).toHaveCount(1);
			await expect(page.locator("#sidebar")).toHaveCount(1);
			await expect(page.locator("#pagination")).toHaveCount(0);
		}

		for (const [path, lang, titlePrefix] of [
			["/images/", "zh-CN", "Pixiv 插画"],
			["/en/images/", "en", "Pixiv Illustration"],
		]) {
			await page.goto(path);
			await expect(page.locator("html")).toHaveAttribute("lang", lang);
			const galleryCards = page.locator(
				"#content-wrapper .image-gallery > a",
			);
			await expect(galleryCards).toHaveCount(4);
			await expect(galleryCards.first()).toContainText(titlePrefix);
			await expect(galleryCards.first().locator("img")).toBeVisible();
			await expect(galleryCards.first()).toHaveClass(/onload-animation/);
			await expect(galleryCards.nth(1)).toHaveAttribute("style", /50ms/);
			await expect(page.locator("#sidebar")).toBeVisible();
			await expect(page.locator('#swup-container[data-show-sidebar="true"]')).toBeVisible();
			await expect(page.locator("#navbar")).toHaveCount(1);
			await expect(page.locator("#pagination")).toHaveCount(0);
		}
	});

	test("图片筛选卡片通过 URL 筛选分类、标签和关键词", async ({ page }) => {
		await page.goto("/images/");
		await expect(page.locator("#image-filters")).toBeVisible();
		await expect(page.locator("#image-filters [data-image-pagination]")).toHaveCount(0);
		await expect(page.locator("#image-pagination")).toBeVisible();
		await expect(page.locator("#content-wrapper h1")).toHaveCount(0);
		await page.locator("[data-filter-trigger=category]").click();
		await expect(page.locator("[data-filter-category-menu]")).toBeVisible();
		const categoryOption = page.locator("[data-filter-category-menu] [data-filter-value]").nth(1);
		const categoryId = await categoryOption.getAttribute("data-filter-value");
		expect(categoryId).toBeTruthy();
		await categoryOption.click();
		await expect(page).toHaveURL(new RegExp(`category=${encodeURIComponent(categoryId ?? "")}`));
		await expect(page.locator("[data-image-card]:not(.hidden)")).toHaveCount(4);
		await page.locator("[data-filter-trigger=tag]").click();
		await page.locator('[data-filter-tag-menu] [data-filter-value="Pixiv"]').click();
		await page.locator("[data-filter-trigger=tag]").click();
		await page.locator('[data-filter-tag-menu] [data-filter-value="插画"]').click();
		await expect(page).toHaveURL(/tag=Pixiv.*tag=%E6%8F%92%E7%94%BB/);
		await page.locator("[data-filter-query]").fill("不存在");
		await expect(page).toHaveURL(/q=%E4%B8%8D%E5%AD%98%E5%9C%A8/);
		await expect(page.locator("[data-image-card]:not(.hidden)")).toHaveCount(0);
		await expect(page.locator("[data-image-empty]")).toBeVisible();
		await expect(page.locator("#image-pagination a")).toHaveCount(0);
		await page.locator("[data-clear-filters]").click();
		await expect(page).toHaveURL(/\/images\/$/);
		await expect(page.locator("[data-image-card]:not(.hidden)")).toHaveCount(4);
	});

	test("顶部语言切换保留当前页面类型", async ({ page }) => {
		await page.goto("/diary/");
		await expect(
			page.locator('#navbar a[data-locale-switch="en"]').first(),
		).toHaveAttribute("href", "/en/diary/");
		await page.locator('#navbar a[data-locale-switch="en"]').first().click();
		await expect(page).toHaveURL(/\/en\/diary\/$/);
		await expect(page.locator("#navbar").first()).toContainText("Archive");
		await page.locator('#navbar a[data-locale-switch="zh"]').first().click();
		await expect(page).toHaveURL(/\/diary\/$/);
		await page.goto("/friends/");
		await expect(page.locator('#navbar a[data-locale-switch="en"]').first()).toHaveAttribute("href", "/en/friends/");
		await page.locator('#navbar a[data-locale-switch="en"]').first().click();
		await expect(page).toHaveURL(/\/en\/friends\/$/);
	});

	test("日记和图片入口显示在中英文顶部导航与手机菜单", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator('#navbar .hidden.md\\:flex a[href="/diary/"]')).toContainText("日记");
		await expect(page.locator('#navbar .hidden.md\\:flex a[href="/images/"]')).toContainText("图片");

		await page.goto("/en/");
		await expect(page.locator('#navbar .hidden.md\\:flex a[href="/en/diary/"]')).toContainText("Diary");
		await expect(page.locator('#navbar .hidden.md\\:flex a[href="/en/images/"]')).toContainText("Images");
		await expect(page.locator('#navbar .hidden.md\\:flex a[href="/en/friends/"]')).toContainText("Friends");

		await page.setViewportSize({ width: 390, height: 844 });
		await page.locator("#nav-menu-switch").click();
		await expect(page.locator('#nav-menu-panel a[href="/en/diary/"]')).toContainText("Diary");
		await expect(page.locator('#nav-menu-panel a[href="/en/images/"]')).toContainText("Images");
		await expect(page.locator('#nav-menu-panel a[href="/en/friends/"]')).toContainText("Friends");
	});

	test("朋友页渲染紧凑的双语链接条目并使用响应式列数", async ({ page }) => {
		for (const [path, lang, title, description] of [
			["/friends/", "zh-CN", "Rin's Blog", "记录文字、光影与生活。"],
			["/en/friends/", "en", "Rin's Blog", "A small space for words, light, and everyday life."],
		]) {
			await page.goto(path);
			await expect(page.locator("html")).toHaveAttribute("lang", lang);
			const card = page.locator(".friend-card").first();
			await expect(card).toContainText(title);
			await expect(card).toContainText(description);
			await expect(card.locator(".friend-card-description")).not.toContainText("github.com");
			await expect(card.locator(".friend-card-host")).toHaveCount(0);
			await expect(card).toHaveAttribute("href", "https://github.com/rin721");
			await expect(card).toHaveAttribute("target", "_blank");
			await expect(card).toHaveAttribute("aria-label", `Rin's Blog: ${description}. External link: https://github.com/rin721`);
			await expect(card.locator("img")).toBeVisible();
			const arrow = card.locator(".friend-card-arrow");
			await expect(arrow).toContainText("↗");
			await expect(arrow).not.toHaveAttribute("title");
			await expect(arrow).toHaveAttribute("aria-label", "External link: https://github.com/rin721");
			const linkPreview = arrow.locator(".friend-card-link-preview");
			await expect(linkPreview).toContainText("https://github.com/rin721");
			await expect(linkPreview).toBeHidden();
			await arrow.hover();
			await expect(linkPreview).toBeVisible();
			if (path === "/friends/") {
				const arrowBounds = await arrow.boundingBox();
				const previewBounds = await linkPreview.boundingBox();
				expect(arrowBounds).not.toBeNull();
				expect(previewBounds).not.toBeNull();
				expect(previewBounds!.x).toBeGreaterThan(arrowBounds!.x + arrowBounds!.width);
				expect(Math.abs((previewBounds!.y + previewBounds!.height / 2) - (arrowBounds!.y + arrowBounds!.height / 2))).toBeLessThan(2);
				await page.screenshot({ path: "docs/evidence/desktop/friends-link-preview-zh.png", fullPage: true });
			}
			await expect(card.locator(".friend-card-tags, .friend-card-visit")).toHaveCount(0);
			const initialTransform = await card.evaluate((element) => getComputedStyle(element).transform);
			await card.hover();
			await expect.poll(() => card.evaluate((element) => getComputedStyle(element).transform)).not.toBe(initialTransform);
		}
	});

	test("图片瀑布流在移动端与桌面端使用配置列数", async ({ page }) => {
		const gallery = page.locator(".image-gallery");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/images/");
		await expect
			.poll(() =>
				gallery.evaluate((element) => {
					const style = getComputedStyle(element);
					return style.columnCount === style.getPropertyValue("--gallery-columns-mobile").trim();
				}),
			)
			.toBe(true);
		await page.setViewportSize({ width: 1440, height: 900 });
		await expect
			.poll(() =>
				gallery.evaluate((element) => {
					const style = getComputedStyle(element);
					return style.columnCount === style.getPropertyValue("--gallery-columns-desktop").trim();
				}),
			)
			.toBe(true);
	});

	test("图片列表与图片文章软导航保持侧栏状态", async ({ page }) => {
		await page.goto("/");
		await page.waitForFunction(() => Boolean((window as unknown as { swup?: unknown }).swup));
		await page.locator('#navbar .hidden.md\\:flex a[href="/images/"]').click();
		await expect(page).toHaveURL(/\/images\/$/);
		await expect(page.locator("#sidebar")).toBeVisible();
		await expect(page.locator('#swup-container[data-show-sidebar="true"]')).toBeVisible();
		await page.locator("[data-filter-query]").fill("Pixiv");
		await expect(page).toHaveURL(/q=Pixiv/);
		await page.locator("[data-clear-filters]").click();

		await page.locator("#content-wrapper .image-gallery > a").first().click();
		await expect(page).toHaveURL(/\/posts\/pixiv-illustration-\d+\/$/);
		await expect(page.locator("#sidebar")).toBeVisible();
		await expect(page.locator('#swup-container[data-show-sidebar="true"]')).toBeVisible();

		await page.locator('#navbar a[href="/"]').first().click();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.locator("#sidebar")).toBeVisible();
	});

	test("软导航仍保留导航栏与侧栏实例", async ({ page }) => {
		await page.goto("/");
		await page.evaluate(() => {
			(window as unknown as { shell?: Node[] }).shell = [
				document.querySelector("#navbar")!,
				document.querySelector("#sidebar")!,
			];
		});
		await page.locator('#navbar .hidden.md\\:flex a[href="/diary/"]').click();
		await expect(page).toHaveURL(/\/diary\/$/);
		await page.waitForFunction(() => document.querySelector("#content-wrapper")?.textContent?.includes("日记") || document.querySelector("#content-wrapper")?.textContent?.includes("这里还没有"));
		expect(
			await page.evaluate(() => {
				const shell = (window as unknown as { shell?: Node[] }).shell;
				return (
					shell?.[0] === document.querySelector("#navbar") &&
					shell?.[1] === document.querySelector("#sidebar")
				);
			}),
		).toBe(true);
	});

	test("归档、关于与 404 仍使用站点外壳", async ({ page }) => {
		await page.goto("/archive/");
		await expect(page.locator("#navbar")).toBeVisible();
		await page.goto("/about/");
		await expect(page.locator(".custom-md")).toBeVisible();
		const oldImageRoute = await page.goto("/photos/");
		expect(oldImageRoute?.status()).toBe(404);
		const response = await page.goto("/this-page-does-not-exist/");
		expect(response?.status()).toBe(404);
	});
});
