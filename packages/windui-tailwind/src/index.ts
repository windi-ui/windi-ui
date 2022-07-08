import plugin from 'tailwindcss/plugin';
import ThemeProvider from './ThemeProvider';
import { Generator } from "windui-core";

const oneValueColors = ['inherit', 'current', 'transparent', 'black', 'white'];

export default plugin((tw) => {
	const tp = new ThemeProvider(tw.theme);
	const gt = (new Generator(tp)).addAll();

	tw.addBase([
		{ ':root': gt.utilities.colorRootVars(oneValueColors) },
		{ ':root': gt.utilities.sizeRootVars() },
		{ '*': gt.utilities.variantRootVars() },
	]);

	const colors = Object.keys(tw.theme('colors')).filter(c => !oneValueColors.includes(c)).reduce((c, v) => { c[v] = v; return c; }, {});
	tw.matchUtilities<string>({
		c: (val) => gt.utilities.colorCssVars(val)
	}, {
		values: colors
	});

	const variants = Object.keys(gt.utilities.variants).reduce((c, v) => { c[v] = v; return c; }, {});
	tw.matchUtilities<string>({
		v: (val) => gt.utilities.variantCssVars(val)
	}, {
		values: variants
	});

	const sizes = Object.keys(gt.utilities.sizes).reduce((c, v) => { c[v] = v; return c; }, {});
	tw.matchUtilities<string>({
		s: (val) => gt.utilities.sizeCssVars(val)
	}, {
		values: sizes
	});

	gt.build().forEach(cmp => {
		tw.addComponents(<any>Generator.componentToCss(cmp));
	});

	//tw.config('darkMode', 'media')

}, {
	content: [],
	theme: {
		extend: {
			colors({ colors }) {
				return { default: colors.gray }
			},
		}
	}
})