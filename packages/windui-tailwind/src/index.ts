import plugin from 'tailwindcss/plugin';
import ThemeProvider from './ThemeProvider';
import { Generator } from "windui-core";

export default plugin(({ addComponents, theme }) => {
	const tp = new ThemeProvider(theme);
	const gt = (new Generator(tp)).addAll();

	gt.build().forEach(cmp => {
		addComponents(<any>Generator.componentToCss(cmp));
	});
})