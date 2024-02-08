import type { ThemeProvider } from 'windui-core';
import type { CSS } from 'windui-core/types';
import type { PluginAPI } from 'tailwindcss/types/config';
import toColorValue from 'tailwindcss/lib/util/toColorValue';
import withAlphaVariable from 'tailwindcss/lib/util/withAlphaVariable';
import { parseColorFormat } from 'tailwindcss/lib/util/pluginUtils';

export class TailwindTheme implements ThemeProvider {
	private theme: PluginAPI['theme'];
	private corePlugins: PluginAPI['corePlugins'];

	constructor({ theme, corePlugins }: PluginAPI) {
		this.theme = theme;
		this.corePlugins = corePlugins;
	}

	colors(name: string) {
		return this.theme<string | Record<string, string>>(`colors.${name}`);
	}

	spacing(name: string) {
		return this.theme<string>(`spacing[${name}]`);
	}

	fontSize(name: string) {
		return this.theme<string>(`fontSize[${name}]`);
	}

	applyTextColor(value: string, target: CSS.Properties) {
		this.applyColor({
			color: value,
			property: 'color',
			variable: '--tw-text-opacity'
		}, 'textOpacity', target);
	}

	applyBackgroundColor(value: string, target: CSS.Properties) {
		this.applyColor({
			color: value,
			property: 'background-color',
			variable: '--tw-bg-opacity'
		}, 'backgroundOpacity', target);
	}

	applyBorderColor(value: string, target: CSS.Properties) {
		this.applyColor({
			color: value,
			property: 'border-color',
			variable: '--tw-border-opacity'
		}, 'borderOpacity', target);
	}

	private applyColor(args: Parameters<typeof withAlphaVariable>[0], opacityPlugin: string, target: CSS.Properties) {
		args = {
			...args,
			color: parseColorFormat(`rgb(${args.color} / <alpha-value>)`)
		};

		Object.assign(target, this.corePlugins(opacityPlugin) ? withAlphaVariable(args) : {
			[args.property]: toColorValue(args.color),
		});
	}
}
