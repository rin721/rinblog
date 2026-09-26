import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type ContentType } from "../src/config";

const segmentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const supportedTypes: ContentType[] = ["home", "diary", "images"];

export interface NewPostOptions {
	id: string;
	type?: ContentType;
	category?: string;
	root?: string;
}

export function isValidPostId(id: string): boolean {
	if (!id || id.includes("\\") || path.posix.isAbsolute(id) || path.win32.isAbsolute(id)) {
		return false;
	}
	return id.split("/").every((segment) => segmentPattern.test(segment));
}

export function createPost({ id, type = "home", category, root = process.cwd() }: NewPostOptions) {
	if (!isValidPostId(id)) {
		throw new Error("文章路径必须由小写字母、数字和连字符组成，可使用 / 分级");
	}
	if (!supportedTypes.includes(type)) {
		throw new Error(`未知 type：${type}`);
	}
	if (category !== undefined && !segmentPattern.test(category)) {
		throw new Error("分类 ID 必须由小写字母、数字和连字符组成");
	}

	const segments = id.split("/");
	const directory = path.resolve(root, "content", "posts", ...segments);
	if (fs.existsSync(directory)) {
		throw new Error(`内容目录已存在：${path.relative(root, directory).split(path.sep).join("/")}`);
	}

	const today = `${new Date().toISOString().slice(0, 10)}T08:00:00Z`;
	const frontmatter = (locale: "zh" | "en") => `---
title: "${locale === "zh" ? "待填写中文标题" : "Fill in the English title"}"
publishedAt: ${today}
type: ${type}
category: "${category ?? ""}"
layout: text # text | illustrated | gallery
tags: [${locale === "zh" ? '"待补充"' : '"TODO"'}]
draft: true
# 图片 type 至少需要 cover 或正文图片
# cover: ./cover.png
# coverAlt: "图片替代文字"
---

${locale === "zh" ? "在这里写下正文。" : "Write the story here."}
`;

	fs.mkdirSync(directory, { recursive: true });
	for (const locale of ["zh", "en"] as const) {
		fs.writeFileSync(path.join(directory, `${locale}.md`), frontmatter(locale), { flag: "wx" });
	}
	return {
		directory,
		category: category ?? "",
		type,
	};
}

function readOption(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (!value || value.startsWith("--")) {
		throw new Error(`${name} 后必须提供值`);
	}
	return value;
}

function main(args: string[]) {
	if (args.includes("--help") || args.includes("-h")) {
		console.log("用法：pnpm new-post <path> [--type home|diary|images] [--category 分类ID]");
		return;
	}

	const id = args[0] && !args[0].startsWith("--") ? args[0] : undefined;
	if (!id) {
		throw new Error("用法：pnpm new-post <path> [--type home|diary|images] [--category 分类ID]");
	}
	const typeValue = readOption(args, "--type") ?? "home";
	if (!supportedTypes.includes(typeValue as ContentType)) {
		throw new Error(`未知 type：${typeValue}`);
	}
	const result = createPost({
		id,
		type: typeValue as ContentType,
		category: readOption(args, "--category"),
	});
	const categoryText = result.category || "未分类";
	console.log(`已创建 ${path.relative(process.cwd(), result.directory).split(path.sep).join("/")}/{zh,en}.md（type=${result.type}, category=${categoryText}，默认草稿）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		main(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
