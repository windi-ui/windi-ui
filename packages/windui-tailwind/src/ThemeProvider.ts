import type { IThemeProvider } from 'windui-core/types';
import type { Config } from 'tailwindcss/types';

type ThemeFunc = <TDefaultValue = Config['theme']>(path?: string, defaultValue?: TDefaultValue) => TDefaultValue;

export default class TailwindTheme implements IThemeProvider {
	constructor(private theme: ThemeFunc) { }

	colors(name: string) {
		return this.theme(`colors.${name}`);
	}
	spacing(name: string) {
		return this.theme(`spacing.${name}`);
	}
}