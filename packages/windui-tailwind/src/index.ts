import { default as createPlugin } from 'tailwindcss/plugin';
import { createTailwindTheme, flattenColorPalette } from './TailwindTheme';
import { create, type Config, type ColorShade } from "windui-core";

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
		//const twc = flattenColorPalette(tw.theme('colors'));

		tw.addBase({ ':root': gt.colors.rootVars() });
		tw.addBase({ ':root': gt.sizeRootVars() });
		tw.addBase({ '*': gt.variants.rootVars() });

		tw.matchUtilities({
			c: (val) => gt.colors.cssVars(val)
		}, { values: keyValuePairs(gt.colors.names()) });

		tw.matchUtilities({
			v: (val) => gt.variants.cssVars(val)
		}, { values: keyValuePairs(gt.variants.names()) });

		tw.matchUtilities({
			s: (val) => gt.sizeCssVars(val)
		}, {
			values: keyValuePairs(gt.getSizeNames())
		});

		// @ts-ignore
		tw.addComponents(gt.getComponentsCss());

		//tw.config('darkMode', 'media')

	}, {
		content: [],
		theme: {
			extend: {
				colors({ colors }) {
					return {
						c: keyValuePairs(Object.keys(colors.gray), v => `rgb(${wiu.vars.color(v as ColorShade)} / <alpha-value>)`),
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
