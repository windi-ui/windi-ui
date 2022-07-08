import { IThemeProvider } from "./types";

const prefix = '--wui';

const C = `${prefix}-c`;
const c = (name: string) => `${C}-${name}`;

const V = `${prefix}-v`;
const v = (name: string) => `${V}-${name}`;

const S = `${prefix}-s`;
const s = (name: string) => `${S}-${name}`;

export interface Variant {
	text: string;
	background: string;
	border: string;
	'text-hover': string;
	'background-hover': string;
	'border-hover': string;
}

export interface Size {
	spacing: string;
	text: string;
}

export default class Utilities {
	readonly variants: { [name: string]: Variant };
	readonly sizes: { [name: string]: Size };

	constructor(readonly themeProvider: IThemeProvider) {
		this.variants = {
			default: {
				background: this.color('50'),
				border: this.color('400'),
				text: this.color('700'),
				'background-hover': this.color('100'),
				'border-hover': this.color('500'),
				'text-hover': this.color('700'),
			},
			solid: {
				background: this.color('600'),
				border: this.color('600'),
				text: this.color('50'),
				'background-hover': this.color('700'),
				'border-hover': this.color('700'),
				'text-hover': this.color('50'),
			},
			outline: {
				background: this.color('transparent'),
				border: this.color('600'),
				text: this.color('600'),
				'background-hover': this.color('600'),
				'border-hover': this.color('600'),
				'text-hover': this.color('50'),
			},
			light: {
				background: this.color('100'),
				border: this.color('100'),
				text: this.color('600'),
				'background-hover': this.color('600'),
				'border-hover': this.color('600'),
				'text-hover': this.color('50'),
			}
		};

		this.sizes = {
			default: {
				spacing: themeProvider.spacing('2'),
				text: themeProvider.fontSize('base')
			},
			xs: {
				spacing: themeProvider.spacing('1'),
				text: themeProvider.fontSize('xs')
			},
			sm: {
				spacing: themeProvider.spacing('1.5'),
				text: themeProvider.fontSize('sm')
			},
			lg: {
				spacing: themeProvider.spacing('3'),
				text: themeProvider.fontSize('lg')
			},
			xl: {
				spacing: themeProvider.spacing('4'),
				text: themeProvider.fontSize('xl')
			},
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

	size(name: keyof Size) {
		return `var(${s(name)})`;
	}

	sizeCssVars(name: string) {
		const size = this.sizes[name];

		if (size) {
			let cssVars = {};
			for (let p in size) {
				cssVars[`${s(p)}`] = size[p];
			}
			return cssVars;
		}
		return {};
	}

	sizeRootVars() {
		return this.sizeCssVars('default');
	}
}