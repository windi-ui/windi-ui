import { IThemeProvider } from "./types";

const C = '--wui-c';
const c = (name: string) => `${C}-${name}`;

export default class Utilities {
	constructor(readonly themeProvider: IThemeProvider) { }

	color(name: string) {
		return `var(${c(name)})`
	}

	colorCssVars(name: string) {
		const color = this.themeProvider.colors(name);

		if (color) {
			switch (typeof color) {
				case 'string':
					return { [`${c(name)}`]: color };
				case 'object':
					let colors = {};
					for (let p in color) {
						colors[`${c(p)}`] = color[p];
					}
					return colors;
			}
		}
		return {};
	}

	colorRootVars(oneValue: string[]) {
		const rootC = {};
		oneValue.forEach(cn => {
			rootC[c(cn)] = this.themeProvider.colors(cn);
		});

		return Object.assign(rootC, this.colorCssVars('default'));
	}
}