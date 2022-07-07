import { IThemeProvider } from "./types";

const prefix = '--wui';

const C = `${prefix}-c`;
const c = (name: string) => `${C}-${name}`;

const V = `${prefix}-v`;
const v = (name: string) => `${V}-${name}`;

export interface Variant {
	text: string,
	background: string,
	border: string,
	'text-hover': string,
	'background-hover': string,
	'border-hover': string,
}

export default class Utilities {
	readonly variants: { [name: string]: Variant };

	constructor(readonly themeProvider: IThemeProvider) {
		this.variants = {
			default: {
				background: this.color('white'),
				border: this.color('400'),
				text: this.color('700'),
				'background-hover': this.color('100'),
				'border-hover': this.color('500'),
				'text-hover': this.color('700'),
			},
			solid: {
				background: this.color('600'),
				border: this.color('600'),
				text: this.color('white'),
				'background-hover': this.color('700'),
				'border-hover': this.color('700'),
				'text-hover': this.color('white'),
			},
			outline: {
				background: this.color('transparent'),
				border: this.color('600'),
				text: this.color('600'),
				'background-hover': this.color('600'),
				'border-hover': this.color('600'),
				'text-hover': this.color('white'),
			}
		};
	}

	color(name: string) {
		return `var(${c(name)})`;
	}

	colorCssVars(name: string) {
		const color = this.themeProvider.colors(name);

		if (color) {
			switch (typeof color) {
				case 'string':
					return { [`${c(name)}`]: color };
				case 'object':
					let cssVars = {};
					for (let p in color) {
						cssVars[`${c(p)}`] = color[p];
					}
					return cssVars;
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

	variant(name: keyof Variant) {
		return `var(${v(name)})`;
	}

	variantCssVars(name: string) {
		const variant = this.variants[name];

		if (variant) {
			let cssVars = {};
			for (let p in variant) {
				cssVars[`${v(p)}`] = variant[p];
			}
			return cssVars;
		}
		return {};
	}

	variantRootVars() {
		return this.variantCssVars('default');
	}
}