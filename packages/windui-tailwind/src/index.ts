import plugin from 'tailwindcss/plugin';
import { TailwindTheme } from './TailwindTheme';
import { create, type Config } from "windui-core";
import { CSSRuleObject } from 'tailwindcss/types/config';

const oneValueColors = ['inherit', 'current', 'transparent', 'black', 'white'];

function colorsToRgb(colors: Record<string, string>) {
	for (const c in colors) {
		const cr = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(colors[c]
			.replace(/^#?([\da-f])([\da-f])([\da-f])$/i, (_, r: string, g: string, b: string) => r + r + g + g + b + b));

		if (cr) {
			colors[c] = `${parseInt(cr[1], 16)} ${parseInt(cr[2], 16)} ${parseInt(cr[3], 16)}`;
		}
	}

	return colors;
}

export default function WindUITailwindCSS(config: Config = {}) {
	const wiu = create(config);

	return  plugin((tw) => {
		const tp = new TailwindTheme(tw);
		const gt = wiu.generator(tp);

		tw.addBase([
			{ ':root': colorsToRgb(gt.colorRootVars(oneValueColors)) },
			{ ':root': gt.sizeRootVars() },
			{ '*': gt.variantRootVars() },
		]);

		const colors = Object.keys(tw.theme('colors'))
			.filter(c => !oneValueColors.includes(c) && c !== 'c')
			.reduce((c, v) => { c[v] = v; return c; }, {} as Record<string, string>);

		tw.matchUtilities<string>({
			c: (val) => colorsToRgb(gt.colorCssVars(val))
		}, {
			values: colors
		});

		tw.matchUtilities<string>({
			v: (val) => gt.variantCssVars(val)
		}, {
			values: gt.getVariantNames().reduce((c, v) => { c[v] = v; return c; }, {} as Record<string, string>)
		});

		tw.matchUtilities<string>({
			s: (val) => gt.sizeCssVars(val)
		}, {
			values: gt.getSizeNames().reduce((c, v) => { c[v] = v; return c; }, {} as Record<string, string>)
		});

		tw.addComponents(gt.getComponentsCss() as CSSRuleObject[]);

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
