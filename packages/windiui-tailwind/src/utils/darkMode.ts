import { DarkModeConfig } from 'tailwindcss/types/config';
import type { DarkSelectorOption } from '@windi-ui/core';
import { RecursiveRecord } from '../types';

export type DarkSelector = string[][];

const BLOCK_SELECTOR_REGEX = /^([^{]+)\{([^}]+)\}$/;
const MODES = ['media', 'class', 'selector', 'variant'];

/** Tailwind expands this key with the app's own dark variant, `@custom-variant dark` included. */
export const VARIANT_DARK: DarkSelector = [['@variant dark']];

/** The `darkSelector` option as a Tailwind `darkMode`: a bare selector is the `selector` strategy. */
export function toDarkMode(option: DarkSelectorOption): DarkModeConfig {
	return (typeof option === 'string' && !MODES.includes(option) ? ['selector', option] : option) as DarkModeConfig;
}

export function getDarkSelector(darkMode: DarkModeConfig): DarkSelector {
	// eslint-disable-next-line prefer-const
	let [mode, selector = '.dark'] = Array.isArray(darkMode) ? darkMode : [darkMode];


	if (typeof selector === 'function') {
		selector = (selector as (() => string))();
	}

	if (typeof selector === 'string') {
		selector = [selector];
	}

	if (mode === 'variant') {
		for (const s of selector) {
			if (!s.startsWith('@') && !s.includes('&')) {
				console.warn("Invalid `variant` selector");
				return [];
			}
		}
	} else if (selector.length !== 1) {
		console.warn("Invalid `darkMode` selector");
		return [];
	}

	switch (mode) {
		case 'media': return [['@media (prefers-color-scheme: dark)']];
		case 'class': return [[`&:is(${selector[0]} *)`]];
		case 'selector': return [[`&:where(${selector[0]}, ${selector[0]} *)`]];
		case 'variant': {
			const ss: string[][] = [];
			for (const s of selector) {
				const bsMatch = BLOCK_SELECTOR_REGEX.exec(s);
				ss.push(bsMatch ? [bsMatch[1].trim(), bsMatch[2].trim()] : [s]);
			}

			return ss;
		}
		default: return [selector];
	}
}

/** The dark selector for a rule on the root element, which `&:is(.dark *)` never matches and `&:not(.light *)` always does: it has no ancestor. */
export function rootDarkSelector(selector: DarkSelector): DarkSelector {
	return selector.map(chain => chain.map(s => s.replace(/^&:(is|not)\((.+) \*\)$/, '&:$1($2, $2 *)')));
}

/** The dark selector for the rule on every element: `&:not(.light *)` matches the `.light` element itself, whose descendants inherit what it sets. */
export function universalDarkSelector(selector: DarkSelector): DarkSelector {
	return selector.map(chain => chain.map(s => s.replace(/^&:not\((.+) \*\)$/, '&:not($1, $1 *)')));
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
function setNestedValue<T extends object, V>(obj: T, keys: string[], value: V) {
	if (keys.length === 0) {
		return obj;
	}

	let curr: any = obj;
	for (let i = 0; i < keys.length; i++) {
		const K = keys[i];
		if (i === keys.length - 1) {
			curr[K] = value;
		} else {
			if (typeof curr[K] !== 'object' || curr[K] === null) {
				curr[K] = {};
			}
			curr = curr[K];
		}
	}

	return obj;
}

export function applyDark<T extends { '@dark'?: RecursiveRecord }>(selector: DarkSelector, styles: T) {
	const { '@dark': darkStyle, ...style } = styles;

	// A nested rule with a dark block of its own, such as a `compound` override
	for (const [key, value] of Object.entries(style)) {
		if (value && typeof value === 'object' && '@dark' in value) (style as RecursiveRecord)[key] = applyDark(selector, value as RecursiveRecord);
	}

	if (darkStyle) {
		for (const s of selector) {
			setNestedValue(style, s, darkStyle);
		}
	}

	return style;
}
