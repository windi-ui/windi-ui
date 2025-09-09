import { default as createPlugin } from 'tailwindcss/plugin';
import { DarkModeConfig } from 'tailwindcss/types/config';
import { create, type Config, type ColorShade, type ApplyVariantSubProp } from "@windi-ui/core";
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

function WindUITailwindCSS(config: Config = {}): ReturnType<typeof createPlugin> {
	const wiu = create(config);

	return createPlugin((tw) => {
		const tp = createTailwindTheme(tw);
		const gt = wiu.generator(tp);

		const darkMode =  tw.config<DarkModeConfig>('darkMode', 'media');
		const darkSelector = getDarkSelector(darkMode);

		tw.addBase({ ':root': gt.colors.rootVars() });
		tw.addBase({ ':root': gt.sizes.rootVars() });
		tw.addBase({ '*': applyDark(darkSelector, gt.variants.rootVars()) });

		tw.matchUtilities({
			c: (val) => gt.colors.cssVars(val)
		}, { values: keyValuePairs(gt.colors.names()) });

		tw.matchUtilities({
			v: (val) => applyDark(darkSelector, gt.variants.cssVars(val)),
		}, { values: keyValuePairs(gt.variants.names()) });

		tw.matchUtilities<ApplyVariantSubProp>({
			'bg': (val, ext) => {
				return gt.variants.utilCss('bg', val as ApplyVariantSubProp, ext.modifier!) as Record<string, string>;
			},
			'border': (val, ext) => {
				return gt.variants.utilCss('border', val as ApplyVariantSubProp, ext.modifier!) as Record<string, string>;
			},
			'text': (val, ext) => {
				return gt.variants.utilCss('text', val as ApplyVariantSubProp, ext.modifier!) as Record<string, string>;
			}
		}, {
			values: { v: 'default', 'v-soft': 'soft', 'v-muted': 'muted', 'v-accent': 'accent' },
			modifiers: tw.theme('opacity')
		});

		tw.matchUtilities({
			s: (val) => gt.sizes.cssVars(val)
		}, {
			values: keyValuePairs(gt.sizes.names())
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
