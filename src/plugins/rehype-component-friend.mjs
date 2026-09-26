import { h } from "hastscript";

const allowedProtocols = new Set(["http:", "https:", "mailto:"]);

function required(properties, name) {
	const value = properties?.[name];
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`[friend] missing required attribute: ${name}`);
	}
	return value.trim();
}

function parseUrl(value) {
	let parsed;
	try {
		parsed = new URL(value);
	} catch {
		throw new Error(`[friend] invalid url: ${value}`);
	}
	if (!allowedProtocols.has(parsed.protocol)) {
		throw new Error(`[friend] unsupported url protocol: ${parsed.protocol}`);
	}
	return parsed;
}

/** Render one link card from a ::friend leaf directive. */
export function FriendCardComponent(properties = {}, children = []) {
	if (Array.isArray(children) && children.length > 0) {
		throw new Error("[friend] use a leaf directive without block content");
	}

	const title = required(properties, "title");
	const icon = required(properties, "icon");
	const url = required(properties, "url");
	parseUrl(url);
	const description = typeof properties.description === "string" ? properties.description : "";

	return h("a", {
		class: "friend-card card-base no-styling group",
		href: url,
		target: "_blank",
		rel: "noopener noreferrer",
		"aria-label": description
			? `${title}: ${description}. External link: ${url}`
			: `${title}. External link: ${url}`,
	}, [
		h("span", { class: "friend-card-icon", "aria-hidden": "true" }, [
			h("img", { src: icon, alt: "", loading: "lazy", decoding: "async", class: "friend-card-icon-image", onerror: "this.hidden=true;this.nextElementSibling.hidden=false" }),
			h("span", { class: "friend-card-icon-fallback", hidden: true }, "↗"),
		]),
		h("span", { class: "friend-card-info" }, [
			h("span", { class: "friend-card-heading" }, [
				h("span", { class: "friend-card-title" }, title),
				h("span", {
					class: "friend-card-arrow",
					role: "img",
					"aria-label": `External link: ${url}`,
				}, [
					"↗",
					h("span", {
						class: "friend-card-link-preview float-panel",
						"aria-hidden": "true",
					}, url),
				]),
			]),
			description && h("span", { class: "friend-card-description" }, description),
		]),
	]);
}
