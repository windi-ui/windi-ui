import { withAlpha, type ColorShade } from '../colors';
import type { CSS, FontSize, ThemeProvider } from '../types';

/** A palette: its 11 shades, each a literal color. */
export type Palette = Record<ColorShade, string>;
/** Palettes by name. */
export type Palettes = Record<string, Palette>;

export interface ThemeProviderOptions {
	/** The palettes of the theme. Left out, there are none, and only the colors of the builder exist. */
	palettes?: Palettes;
	/** Spacing values by key, over Tailwind's scale: `'px'` is `1px` and a number `n` is `n * 0.25rem`. */
	spacing?: Record<string, string>;
	/** Font sizes by key, over Tailwind 4's `xs` to `9xl`. */
	fontSize?: Record<string, FontSize>;
}

const FONT_SIZE: Record<string, FontSize> = {
	'xs': ['0.75rem', { lineHeight: 'calc(1 / 0.75)' }],
	'sm': ['0.875rem', { lineHeight: 'calc(1.25 / 0.875)' }],
	'base': ['1rem', { lineHeight: 'calc(1.5 / 1)' }],
	'lg': ['1.125rem', { lineHeight: 'calc(1.75 / 1.125)' }],
	'xl': ['1.25rem', { lineHeight: 'calc(1.75 / 1.25)' }],
	'2xl': ['1.5rem', { lineHeight: 'calc(2 / 1.5)' }],
	'3xl': ['1.875rem', { lineHeight: 'calc(2.25 / 1.875)' }],
	'4xl': ['2.25rem', { lineHeight: 'calc(2.5 / 2.25)' }],
	'5xl': ['3rem', { lineHeight: '1' }],
	'6xl': ['3.75rem', { lineHeight: '1' }],
	'7xl': ['4.5rem', { lineHeight: '1' }],
	'8xl': ['6rem', { lineHeight: '1' }],
	'9xl': ['8rem', { lineHeight: '1' }],
};

/**
 * A theme without Tailwind: palettes, a spacing scale and font sizes, painted in the form of Tailwind 4. It runs
 * anywhere JavaScript does, in Node, edge runtimes and browsers.
 */
export function createThemeProvider({ palettes = {}, spacing = {}, fontSize = {} }: ThemeProviderOptions = {}): ThemeProvider {
	const flat: Record<string, string> = {};
	for (const [name, palette] of Object.entries(palettes)) {
		for (const [shade, color] of Object.entries(palette)) flat[`${name}-${shade}`] = color;
	}

	const sizes = { ...FONT_SIZE, ...fontSize };

	return {
		colors: ((name?: string) => name == null ? { ...flat } : palettes[name] ? { ...palettes[name] } : flat[name]) as ThemeProvider['colors'],
		spacing: name => spacing[name] ?? (name === 'px' ? '1px' : `${Number(name) / 4}rem`),
		fontSize: name => sizes[name],
		colorValue: withAlpha,
		applyTextColor: (value, target: CSS.Properties, alpha) => void (target.color = withAlpha(value, alpha)),
		applyBackgroundColor: (value, target: CSS.Properties, alpha) => void (target.backgroundColor = withAlpha(value, alpha)),
		applyBorderColor: (value, target: CSS.Properties, alpha) => void (target.borderColor = withAlpha(value, alpha)),
	};
}
