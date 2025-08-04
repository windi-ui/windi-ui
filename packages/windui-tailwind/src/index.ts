import { default as createPlugin } from 'tailwindcss/plugin';
import { createTailwindTheme, flattenColorPalette } from './TailwindTheme';
import { create, type Config } from "windui-core";

const COLOR_PALETTE_REGEX = /^(.+)-(50|950|[1-9]00)$/;

function getColors(twc: Record<string, string>) {
	const cMap = new Map<string, number>();
	for (const key in twc) {
		const mRes = COLOR_PALETTE_REGEX.exec(key);
		if (mRes) {
			const cName = mRes[1];
			if (cName === 'c') continue;
			cMap.set(cName, (cMap.get(cName) ?? 0) + 1);
		}
	}

	for (const [cName, score] of cMap) {
		if (score !== 11) {
			console.warn(`Tailwind CSS color palette "${cName}" does not have required 11 shades (50, 100, ..., 950).`);
			cMap.delete(cName);
		}
	}

	return [...cMap.keys()];
}

function WindUITailwindCSS(config: Config = {}): ReturnType<typeof createPlugin> {
	const wiu = create(config);

	return createPlugin((tw) => {
		const tp = createTailwindTheme(tw);
		const gt = wiu.generator(tp);
		const twc = flattenColorPalette(tw.theme('colors'));

		tw.addBase({ ':root': gt.colorRootVars() });
		tw.addBase({ ':root': gt.sizeRootVars() });
		tw.addBase({ '*': gt.variantRootVars() });

		const colors = getColors(twc)
			.reduce((c, v) => { c[v] = v; return c; }, {} as Record<string, string>);

		tw.matchUtilities({
			c: (val) => gt.colorCssVars(val)
		}, { values: colors });

		tw.matchUtilities({
			v: (val) => gt.variantCssVars(val)
		}, {
			values: gt.getVariantNames().reduce((c, v) => { c[v] = v; return c; }, {} as Record<string, string>)
		});

		tw.matchUtilities({
			s: (val) => gt.sizeCssVars(val)
		}, {
			values: gt.getSizeNames().reduce((c, v) => { c[v] = v; return c; }, {} as Record<string, string>)
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
						c: Object.keys(colors.gray).reduce((c, v) => { c[v] = `rgb(${wiu.cssVars.color(v)} / <alpha-value>)`; return c; }, {} as Record<string, string>),
						default: colors.gray
					};
				},
			}
		}
	});
}

export default WindUITailwindCSS;
