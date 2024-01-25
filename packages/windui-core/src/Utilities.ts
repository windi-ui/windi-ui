import { IThemeProvider } from "./types";

const prefix = '--wui';

function cssVarEsc(name: string) {
	return name.replace(/([\.\:])/g, '\\$1');
}

function cssVars(
	obj: Record<string, string | Record<string, string>>,
	keyMap: (p: string) => string,
	vars: Record<string, string> = {}): Record<string, string> {
	for (const p in obj) {
		const val = obj[p];
		if (typeof val === 'string') {
			vars[cssVarEsc(keyMap(p))] = val;
		} else {
			cssVars(val, (cp) => `${keyMap(p)}-${cp}`, vars);
		}
	}
	return vars;
}

const C = `${prefix}-c`;
const c = (name: string) => `${C}-${name}`;

const V = `${prefix}-v`;
const v = (name: string) => `${V}-${name}`;

const S = `${prefix}-s`;
const s = (name: string) => `${S}-${name}`;

type Variant = {
	text: string;
	background: string;
	border: string;
	'text-hover': string;
	'background-hover': string;
	'border-hover': string;
};

type Size = {
	spacing: {
		'1': string;
		'1.5': string;
		'2': string;
		'3': string;
		'4': string;
	};
	text: string;
};

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
				spacing: {
					'1': themeProvider.spacing('1'),
					'1.5': themeProvider.spacing('1.5'),
					'2': themeProvider.spacing('2'),
					'3': themeProvider.spacing('3'),
					'4': themeProvider.spacing('4'),
				},
				text: themeProvider.fontSize('base')
			},
			xs: {
				spacing: {
					'1': themeProvider.spacing('px'),
					'1.5': themeProvider.spacing('0.5'),
					'2': themeProvider.spacing('1'),
					'3': themeProvider.spacing('1.5'),
					'4': themeProvider.spacing('2'),
				},
				text: themeProvider.fontSize('xs')
			},
			sm: {
				spacing: {
					'1': themeProvider.spacing('0.5'),
					'1.5': themeProvider.spacing('1'),
					'2': themeProvider.spacing('1.5'),
					'3': themeProvider.spacing('2'),
					'4': themeProvider.spacing('3'),
				},
				text: themeProvider.fontSize('sm')
			},
			lg: {
				spacing: {
					'1': themeProvider.spacing('1.5'),
					'1.5': themeProvider.spacing('2'),
					'2': themeProvider.spacing('3'),
					'3': themeProvider.spacing('4'),
					'4': themeProvider.spacing('5'),
				},
				text: themeProvider.fontSize('lg')
			},
			xl: {
				spacing: {
					'1': themeProvider.spacing('2'),
					'1.5': themeProvider.spacing('3'),
					'2': themeProvider.spacing('4'),
					'3': themeProvider.spacing('5'),
					'4': themeProvider.spacing('6'),
				},
				text: themeProvider.fontSize('xl')
			},
		};
	}

	color(name: string) {
		return `var(${cssVarEsc(c(name))})`;
	}

	colorCssVars(name: string) {
		const color = this.themeProvider.colors(name);

		if (color) {
			switch (typeof color) {
				case 'string':
					return { [`${c(name)}`]: color };
				case 'object':
					return cssVars(color, c);
			}
		}
		return {};
	}

	colorRootVars(oneValue: string[]) {
		const rootC: Record<string, string | Record<string, string>> = {};
		oneValue.forEach(cn => {
			rootC[c(cn)] = this.themeProvider.colors(cn);
		});

		return Object.assign(rootC, this.colorCssVars('default'));
	}

	variant(name: keyof Variant) {
		return `var(${cssVarEsc(v(name))})`;
	}

	variantCssVars(name: string) {
		const variant = this.variants[name];

		if (variant) {
			return cssVars(variant, v);
		}
		return {};
	}

	variantRootVars() {
		return this.variantCssVars('default');
	}

	size(name: 'text'): string;
	size(name: `spacing-${keyof Size['spacing']}`): string;
	size(name: string) {
		return `var(${cssVarEsc(s(name))})`;
	}

	sizeCssVars(name: string) {
		const size = this.sizes[name];

		if (size) {
			return cssVars(size, s);
		}
		return {};
	}

	sizeRootVars() {
		return this.sizeCssVars('default');
	}
}
