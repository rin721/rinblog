import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";
import type { AppLocale } from "./utils/locale";

/**
 * 站点品牌与全局显示设置。文案的中英两份放在 siteText，
 * 这里只保留与语言无关的结构性配置。
 */
export const siteConfig: SiteConfig = {
	title: "Rin's Blog",
	subtitle: "在文字与光影之间",
	lang: "zh_CN", // 词典默认语言，页面语言由路由决定
	themeColor: {
		hue: 250, // 默认主题色相（蓝）
		fixed: false, // 允许读者自行调整色相
	},
	banner: {
		enable: true, // 首屏使用简洁卡片流，不启用横幅大图
		src: "assets/images/demo-banner.png",
		position: "center",
		credit: {
			enable: true,
			text: "GPTImage",
			url: "https://chatgpt.com",
		},
	},
	toc: {
		enable: true,
		depth: 2,
	},
	favicon: [
		{
			src: "/favicon.svg",
			sizes: "any",
		},
	],
};

/** 按语言提供的站点文案：副标题、meta 描述、作者名与简介。 */
export const siteText: Record<
	AppLocale,
	{ subtitle: string; description: string; author: string; bio: string }
> = {
	zh: {
		subtitle: "咕咕嘎嘎",
		description:
			"在文字与光影之间，记录生活，整理思考。一个关于日常、学习与慢慢生长的个人博客。",
		author: "Rin's Blog",
		bio: "这是一处等待真实故事的写作空间。",
	},
	en: {
		subtitle: "Between words and light",
		description:
			"A personal journal of everyday discoveries, things learned, and moments worth keeping. A little space to think, slowly.",
		author: "Rin's Blog",
		bio: "A writing space waiting for real stories.",
	},
};

export type ContentType = "home" | "diary" | "images";
export type CategoryLabel = Partial<Record<AppLocale, string>>;
export type CategoryLabels = Record<string, CategoryLabel>;

/** 分类 ID 与显示名分离；重命名不会改变内容归属或链接。 */
export const categoryConfig: {
	labels: CategoryLabels;
} = {
	labels: {
		article: { zh: "文章", en: "Essay" },
		diary: { zh: "日记", en: "Diary" },
		note: { zh: "学习笔记", en: "Study note" },
	},
};

export function resolveCategoryLabel(
	id: string,
	locale: AppLocale,
	labels = categoryConfig.labels,
): string {
	return (
		labels[id]?.[locale] ?? labels[id]?.[locale === "zh" ? "en" : "zh"] ?? id
	);
}

export const sectionConfig: Record<ContentType, Record<AppLocale, string>> = {
	home: { zh: "首页", en: "Home" },
	diary: { zh: "日记", en: "Diary" },
	images: { zh: "图片", en: "Images" },
};

/** 图片页瀑布流显示设置，列数按移动端、平板和桌面断点分别配置。 */
export const imagesPageConfig = {
	gallery: {
		columns: { mobile: 2, tablet: 2, desktop: 3 },
		gap: 16,
	},
	sidebar: {
		list: true,
		post: true,
	},
} as const;

/** 全站 friend Markdown 卡片的响应式布局。 */
export const friendsMarkdownConfig = {
	columns: { mobile: 1, tablet: 2, desktop: 3 },
	gap: 16,
} as const;

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		LinkPreset.Friends,
		// {
		// 	name: "GitHub",
		// 	url: "https://github.com/rin721", // Internal links should not include the base path, as it is automatically added
		// 	external: true, // Show an external link icon and will open in a new tab
		// },
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.png",
	name: "Xiaolin",
	bio: "这是一处等待真实故事的写作空间。",
	links: [
		{
			name: "Twitter",
			icon: "fa6-brands:twitter", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://twitter.com/rin721qwq",
		},
		// {
		// 	name: "Steam",
		// 	icon: "fa6-brands:steam",
		// 	url: "https://store.steampowered.com",
		// },
		// {
		// 	name: "Telegram",
		// 	icon: "fa6-brands:telegram",
		// 	url: "https://t.me/rin721qwq",
		// 	// external: true, // Show an external link icon and will open in a new tab
		// 	// Note: Telegram links should use the format https://t.me/username for best compatibility with link preview plugins. Links using the tg:// protocol may not work correctly with some plugins.
		// },
		{
			name: "Email",
			icon: "fa6-solid:envelope",
			url: "mailto:rin721qwq@gmail.com",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/rin721",
		},
		// {
		// 	name: "BiliBili",
		// 	icon: "fa6-brands:bilibili",
		// 	url: "https://space.bilibili.com/403597865", // Replace with actual BiliBili URL
		// },
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// 部分样式（如背景色）在 astro.config.mjs 中覆盖，这里选择深色代码主题。
	theme: "github-dark",
};
