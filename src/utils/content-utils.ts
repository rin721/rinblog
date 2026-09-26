import type { AppLocale } from "@utils/locale";
import { getCategoryUrl } from "@utils/url-utils";
import { type BlogPost, postsFor } from "@/lib/posts";

/** 列表只需要文章摘要数据，不必带上正文与渲染函数。 */
export type PostForList = {
	slug: string;
	data: BlogPost["data"];
};

export async function getSortedPosts(locale: AppLocale): Promise<BlogPost[]> {
	return postsFor(locale);
}

export async function getTypePosts(
	locale: AppLocale,
	type: BlogPost["data"]["type"],
): Promise<BlogPost[]> {
	return (await postsFor(locale)).filter(
		(post) => post.data.type === type,
	);
}

export async function getSortedPostsList(
	locale: AppLocale,
): Promise<PostForList[]> {
	const sortedFullPosts = await postsFor(locale);
	return sortedFullPosts.map((post) => ({
		slug: post.slug,
		data: post.data,
	}));
}

export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(locale: AppLocale): Promise<Tag[]> {
	const allBlogPosts = await postsFor(locale);

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	id: string;
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(locale: AppLocale): Promise<Category[]> {
	const allBlogPosts = await postsFor(locale);
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post) => {
		const id = post.data.categoryId;
		if (!id) return;
		count[id] = count[id] ? count[id] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) =>
		a.toLowerCase().localeCompare(b.toLowerCase()),
	);

	const ret: Category[] = [];
	for (const id of lst) {
		ret.push({
			id,
			name: String(
				allBlogPosts.find((post) => post.data.categoryId === id)?.data
					.category ?? id,
			),
			count: count[id],
			url: getCategoryUrl(id, locale),
		});
	}
	return ret;
}
