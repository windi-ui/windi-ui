import { default as createPlugin } from 'tailwindcss/plugin';
import type { CSSRuleObject, DarkModeConfig } from 'tailwindcss/types/config';
import { create, type Config, type ColorShade, type ApplyVariantMainProp, type ApplyVariantSubProp } from "@windi-ui/core";
import { createTailwindTheme, TailwindVer } from './theme';
import { getDarkSelector, applyDark } from './utils/darkMode';

function keyValuePairs(
	keys: string[],
	val = (k: string) => k
): Record<string, string> {
	return keys.reduce((acc, k) => {
		acc[k] = val(k);
		return acc;
	}, {} as Record<string, string>);
}

const VARIANT_UTILS = { v: 'default', 'v-soft': 'soft', 'v-muted': 'muted', 'v-accent': 'accent' } as const;

type UtilExtra = { modifier: string | null };

// `{}` leaves an empty rule on Tailwind 3; `null` and `undefined` throw on Tailwind 4.
const NOTHING = [] as unknown as CSSRuleObject;

/** Tailwind also calls a `matchUtilities` callback for arbitrary values (`bg-[#123456]`, `c-[foo]`), which emit nothing. */
function known<T extends string>(values: Iterable<T>, css: (val: T, ext: UtilExtra) => CSSRuleObject) {
	const set = new Set<string>(values);
	return (val: string, ext: UtilExtra) => set.has(val) ? css(val as T, ext) : NOTHING;
}

function WindUITailwindCSS(config: Config = {}): ReturnType<typeof createPlugin> {
	const wiu = create(config);

	return createPlugin((tw) => {
		const isV3 = typeof tw.corePlugins === 'function';
		const tp = createTailwindTheme(tw);
		const gt = wiu.generator(tp);

		const darkMode =  tw.config<DarkModeConfig>('darkMode', 'media');
		const darkSelector = getDarkSelector(darkMode);

		tw.addBase({ ':root': gt.colors.rootVars() });
		tw.addBase({ ':root': gt.sizes.rootVars() });
		tw.addBase({ '*': applyDark(darkSelector, gt.variants.rootVars()) });

		const colorNames = gt.colors.names();
		const variantNames = gt.variants.names();
		const sizeNames = gt.sizes.names();

		tw.matchUtilities({
			c: known(colorNames, (val) => gt.colors.cssVars(val))
		}, { values: keyValuePairs(colorNames) });

		tw.matchUtilities({
			v: known(variantNames, (val) => applyDark(darkSelector, gt.variants.cssVars(val))),
		}, { values: keyValuePairs(variantNames) });

		const variantUtil = (prop: ApplyVariantMainProp) => known<ApplyVariantSubProp>(
			Object.values(VARIANT_UTILS),
			(val, ext) => gt.variants.utilCss(prop, val, ext.modifier ?? undefined) as Record<string, string>
		);

		tw.matchUtilities({
			bg: variantUtil('bg'),
			border: variantUtil('border'),
			text: variantUtil('text'),
		}, {
			values: VARIANT_UTILS,
			modifiers: tw.theme('opacity'),
			// Tailwind 3 drops `bg-[#123456]` as ambiguous before the callback runs unless the type is narrowed.
			...(isV3 ? { type: ['lookup'] } : {})
		});

		tw.matchUtilities({
			s: known(sizeNames, (val) => gt.sizes.cssVars(val))
		}, {
			values: keyValuePairs(sizeNames)
		});

		// @ts-ignore
		tw.addComponents([...gt.components.css()]);
	}, {
		content: [],
		theme: {
			extend: {
				colors({ colors }) {
					return {
						c: keyValuePairs(Object.keys(colors.gray), v => {
							const c = wiu.vars.color(v as ColorShade);
							return TailwindVer === 4 ? c : `rgb(${c} / <alpha-value>)`;
						}),
						// TODO: add as configurable option
						default: colors.gray,
						accent: colors.blue,
					};
				},
			}
		}
	});
}

export default WindUITailwindCSS;
