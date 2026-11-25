import type { ThemeProvider, FontSize } from "./types";
import { type CSSValues, type CSSVarName, cssVars } from "./vars";
import { type BuilderContext, VarsGeneratorBase } from "./base";

export type SizeVars = Record<CSSVarName<'s'>, string>;
export type SizeProperty = 'text' | `spacing-${keyof Size['spacing']}` | 'line-height' | 'letter-spacing' | 'font-weight' | (string & {});

export type Size = {
	spacing: {
		'1': string;
		'1.5': string;
		'2': string;
		'3': string;
		'4': string;
	};
	text: FontSize;
	/** A key of your own: a string or a number is written to `--wui-s-<key>`, after the built-in variables. */
	[key: string]: unknown;
};

export function sizes(themeProvider: ThemeProvider) {
	return {
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

export class SizesGenerator extends VarsGeneratorBase<Size, SizeVars> {
	protected readonly items: Map<string, Size>;
	/** Whether `md` names the `default` size while no size of that name exists. Removing `md` ends it. */
	private md = true;

	constructor(ctx: BuilderContext) {
		super(ctx);
		this.items = new Map(Object.entries(sizes(this.theme)));
	}

	private alias(name: string) {
		return name === 'md' && this.md && !this.items.has('md');
	}

	names(): string[] {
		const names = super.names();
		return this.alias('md') ? names.flatMap(n => n === 'default' ? [n, 'md'] : [n]) : names;
	}

	update(name: string, builder: (element: Size, ctx: BuilderContext) => Size | void) {
		// The alias becomes a size of its own, so that the change leaves `default` as it is.
		if (this.alias(name)) this.items.set(name, structuredClone(this.items.get('default')!));
		super.update(name, builder);
	}

	remove(name: string) {
		const alias = this.alias(name);
		if (name === 'md') this.md = false;
		if (!alias) super.remove(name);
	}

	cssVars(name: string): SizeVars {
		const size = this.items.get(this.alias(name) ? 'default' : name);
		if (!size) {
			console.error(`Size "${name}" not found.`);
			return {};
		}

		const { spacing, text: sText, ...own } = size;
		const rSize: CSSValues = { spacing, text: Array.isArray(sText) ? sText[0] : sText };
		if (Array.isArray(sText)) {
			const rVal = sText[1];
			if (typeof rVal === 'string') {
				rSize['line-height'] = rVal;
			} else if (typeof rVal === 'object' && rVal !== null) {
				if (rVal.lineHeight) rSize['line-height'] = rVal.lineHeight;
				if (rVal.letterSpacing) rSize['letter-spacing'] = rVal.letterSpacing;
				if (rVal.fontWeight) rSize['font-weight'] = rVal.fontWeight;
			}
		}

		// Keys of your own come last, so that the built-in variables keep their order.
		Object.assign(rSize, own);

		return cssVars(rSize, n => this.vars.s(n));
	}
}
