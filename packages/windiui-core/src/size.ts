import type { ThemeProvider, FontSize } from "./types";
import { type CSSValues, type CSSVarName, cssVars } from "./vars";
import { type BuilderContext, VarsGeneratorBase } from "./base";

export type SizeVars = Record<CSSVarName<'s'>, string>;
export type SizeProperty = 'text' | `spacing-${keyof Size['spacing']}` | 'line-height';

export type Size = {
	spacing: {
		'1': string;
		'1.5': string;
		'2': string;
		'3': string;
		'4': string;
	};
	text: FontSize;
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

	constructor(ctx: BuilderContext) {
		super(ctx);
		this.items = new Map(Object.entries(sizes(this.theme)));
	}

	cssVars(name: string): SizeVars {
		const size = this.items.get(name);
		if (!size) {
			console.error(`Size "${name}" not found.`);
			return {};
		}

		const rSize = { ...size } as CSSValues;
		const sText = size.text;
		if (Array.isArray(sText)) {
			rSize.text = sText[0];
			const rVal = sText[1];
			if (typeof rVal === 'string') {
				rSize['line-height'] = rVal;
			} else if (typeof rVal === 'object' && rVal !== null) {
				if (rVal.lineHeight) rSize['line-height'] = rVal.lineHeight;
				if (rVal.letterSpacing) rSize['letter-spacing'] = rVal.letterSpacing;
				if (rVal.fontWeight) rSize['font-weight'] = rVal.fontWeight;
			}
		}

		return cssVars(rSize, n => this.vars.s(n));
	}
}
