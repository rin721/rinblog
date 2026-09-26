import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readContent, validateContent, validateFriendPages, validateFriendSource } from "../../scripts/check-content";
import { createPost, isValidPostId } from "../../scripts/new-post";
import { categoryConfig, friendsMarkdownConfig, imagesPageConfig, resolveCategoryLabel } from "../../src/config";

describe("内容协议", () => {
	it("现有内容全部通过字段、标识与图片校验", async () => {
		const records = await readContent();
		expect(records.length).toBeGreaterThan(0);
		expect(await validateContent(records)).toEqual([]);
	});

	it("草稿在内容数据里被标记，构建时会从集合中排除", async () => {
		const records = await readContent();
		const drafts = records.filter((record) => record.data.draft === true);
		expect(drafts.length).toBeGreaterThan(0);
		expect(drafts.every((draft) => typeof draft.data.draft === "boolean")).toBe(true);
	});

	it("同一内容组的中英版本共享标识", async () => {
		const records = await readContent();
		const groups = new Map<string, Set<string>>();
		for (const record of records) {
			const locales = groups.get(record.id) ?? new Set<string>();
			locales.add(record.locale);
			groups.set(record.id, locales);
		}
		const bilingual = [...groups.values()].filter((locales) => locales.has("zh") && locales.has("en"));
		expect(bilingual.length).toBeGreaterThan(0);
	});

	it("拒绝缺少标题的 frontmatter", async () => {
		const errors = await validateContent([
			{
				file: `${process.cwd()}/content/posts/example/zh.md`,
				id: "example",
				locale: "zh",
				data: { publishedAt: "2026-01-01", category: "article", layout: "text", tags: ["a"] },
				body: "",
			},
		]);
		expect(errors.join("\n")).toContain("title");
	});

	it("type 缺省为 home，category 可缺省或留空", async () => {
		const record = {
			file: `${process.cwd()}/content/posts/example/zh.md`,
			id: "example",
			locale: "zh" as const,
			data: { title: "标题", publishedAt: "2026-01-01", category: "article", layout: "text", tags: ["a"] },
			body: "正文",
		};
		expect(await validateContent([record])).toEqual([]);
		const missingCategory = await validateContent([{ ...record, data: { ...record.data, category: undefined } }]);
		expect(missingCategory).toEqual([]);
		const emptyCategory = await validateContent([{ ...record, data: { ...record.data, category: "" } }]);
		expect(emptyCategory).toEqual([]);
	});

	it("new-post 接受安全的多级路径并允许省略分类", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "journal-new-post-"));
		try {
			const result = createPost({ id: "blog/ndp-responder-for-ipv6-subnet", root });
			expect(result.type).toBe("home");
			expect(result.category).toBe("");
			const zh = await fs.readFile(path.join(result.directory, "zh.md"), "utf8");
			const en = await fs.readFile(path.join(result.directory, "en.md"), "utf8");
			expect(zh).toContain("type: home");
			expect(zh).toContain('category: ""');
			expect(en).toContain('category: ""');
			const records = await readContent(root);
			expect(records.map((record) => [record.id, record.locale]).sort((a, b) => a[1].localeCompare(b[1]))).toEqual([
				["blog/ndp-responder-for-ipv6-subnet", "en"],
				["blog/ndp-responder-for-ipv6-subnet", "zh"],
			]);
			expect(await validateContent(records, root)).toEqual([]);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("new-post 可显式分类并拒绝危险路径和重复目录", async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "journal-new-post-"));
		try {
			const result = createPost({ id: "blog/entry", category: "custom-topic", root });
			expect(await fs.readFile(path.join(result.directory, "zh.md"), "utf8")).toContain("category: \"custom-topic\"");
			expect(() => createPost({ id: "../escape", root })).toThrow();
			expect(() => createPost({ id: "blog\\escape", root })).toThrow();
			expect(() => createPost({ id: "blog/entry", root })).toThrow("已存在");
			expect(isValidPostId("blog/valid-entry")).toBe(true);
			expect(isValidPostId("blog//invalid")).toBe(false);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it("分类可用稳定 ID 新增与重命名中英文显示名", () => {
		const renamed = { ...categoryConfig.labels, travel: { zh: "旅行", en: "Travel" } };
		expect(resolveCategoryLabel("travel", "zh", renamed)).toBe("旅行");
		expect(resolveCategoryLabel("travel", "en", { travel: { zh: "旅行" } })).toBe("旅行");
		expect(resolveCategoryLabel("unlisted", "zh", renamed)).toBe("unlisted");
		const renamedLabel = { ...renamed, travel: { zh: "远行", en: "Journeys" } };
		expect(resolveCategoryLabel("travel", "zh", renamedLabel)).toBe("远行");
		expect(Object.keys(renamedLabel)).toContain("travel");
	});

	it("图片列表页和详情页默认开启侧栏", () => {
		expect(imagesPageConfig.sidebar).toEqual({ list: true, post: true });
	});

	it("朋友页链接文档通过 friend 指令校验", async () => {
		expect(await validateFriendPages()).toEqual([]);
		expect(friendsMarkdownConfig.columns).toEqual({ mobile: 1, tablet: 2, desktop: 3 });
	});

	it("friend 指令拒绝缺少字段和不安全地址", async () => {
		const errors = await validateFriendSource(
			'::friend{title="Bad" icon="/missing.png" url="javascript:alert(1)"}',
			`${process.cwd()}/content/pages/links-zh.md`,
		);
		expect(errors.join("\n")).toContain("协议不受支持");
		expect(errors.join("\n")).toContain("图标不存在");
	});

	it("图片分区必须提供封面或正文图片", async () => {
		const errors = await validateContent([{
			file: `${process.cwd()}/content/posts/image-entry/zh.md`,
			id: "image-entry",
			locale: "zh",
			data: { title: "图片", publishedAt: "2026-01-01", type: "images", layout: "text", tags: ["a"] },
			body: "只有文字",
		}]);
		expect(errors.join("\n")).toContain("图片 type 必须设置 cover");
	});

	it("允许任意已配置的分类 ID 并以稳定 ID 作为分类", async () => {
		const id = "unlisted-category";
		const errors = await validateContent([{
			file: `${process.cwd()}/content/posts/example/zh.md`,
			id: "example",
			locale: "zh",
			data: { title: "标题", publishedAt: "2026-01-01", category: id, layout: "text", tags: ["a"] },
			body: "正文",
		}]);
		expect(errors).toEqual([]);
	});

	it("拒绝不合法的分类 ID", async () => {
		const errors = await validateContent([{
			file: `${process.cwd()}/content/posts/example/zh.md`,
			id: "example",
			locale: "zh",
			data: { title: "标题", publishedAt: "2026-01-01", category: "Missing Category", layout: "text", tags: ["a"] },
			body: "正文",
		}]);
		expect(errors.join("\n")).toContain("category");
	});
});
