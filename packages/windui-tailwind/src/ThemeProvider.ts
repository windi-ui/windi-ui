import type { IThemeProvider } from 'windui-core/types';
import type { PluginAPI } from 'tailwindcss/types/config';

type ThemeFunc = PluginAPI['theme'];

export default class TailwindTheme implements IThemeProvider {
	constructor(private theme: ThemeFunc) { }

	colors(name: string) {
		return this.theme(`colors.${name}`);
	}
	spacing(name: string) {
		return this.theme(`spacing.${name}`);
	}
}