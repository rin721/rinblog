import fs from "node:fs";
import path from "node:path";
import { type ContentType } from "../src/config";

const args = process.argv.slice(2);
const id = args[0];
const value = (name: string) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};
const type = (value("--type") ?? "home") as ContentType;
const category = value("--category");

if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
	console.error("用法：pnpm new-post <id> [--type home|diary|images] [--category 分类ID]");
	process.exit(1);
}
if (!( ["home", "diary", "images"] as ContentType[]).includes(type)) {
	console.error(`未知 type：${type}`);
	process.exit(1);
}

if (!category || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) {
	console.error("必须通过 --category 提供非空的小写分类 ID");
	process.exit(1);
}

const dir = path.join("content/posts", id);
if (fs.existsSync(dir)) {
	console.error(`内容目录已存在：${dir}`);
	process.exit(1);
}
const today = `${new Date().toISOString().slice(0, 10)}T08:00:00Z`;
const frontmatter = (lang: "zh" | "en") => `---
title: "${lang === "zh" ? "待填写中文标题" : "Fill in the English title"}"
publishedAt: ${today}
type: ${type}
category: ${category}
layout: text # text | illustrated | gallery
tags: [${lang === "zh" ? '"待补充"' : '"TODO"'}]
draft: true
# 图片 type 至少需要 cover 或正文图片
# cover: ./cover.png
# coverAlt: "图片替代文字"
---

${lang === "zh" ? "在这里写下正文。" : "Write the story here."}
`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "zh.md"), frontmatter("zh"));
fs.writeFileSync(path.join(dir, "en.md"), frontmatter("en"));
console.log(`已创建 ${dir}/zh.md 与 ${dir}/en.md（type=${type}, category=${category}，默认草稿）`);
