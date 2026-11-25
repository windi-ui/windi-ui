import { create, type Config, type ThemeProvider } from '@windi-ui/core';
import { unwrap } from './utils/configState';

export type SafelistAxis = 'c' | 'v' | 's';

export interface SafelistOptions {
	/** The kinds of classes to list. All three by default. */
	axes?: SafelistAxis[];
	/**
	 * The palettes of the Tailwind theme that have all 11 shades. By default those of Tailwind 4's default theme; name
	 * yours when the theme adds or removes palettes. Colors of the config's `build` are added to them.
	 */
	palettes?: string[];
}

const AXES: SafelistAxis[] = ['c', 'v', 's'];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** The palettes of Tailwind 4's default theme. Tailwind 3 has no mauve, olive, mist and taupe. */
const PALETTES = [
	'slate', 'gray', 'zinc', 'neutral', 'stone', 'mauve', 'olive', 'mist', 'taupe', 'red', 'orange', 'amber', 'yellow',
	'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

const braces = (items: string[]) => items.length === 1 ? items[0] : `{${items.join(',')}}`;

/** The classes of the given names as one brace expression, sorted: `{c-{blue,red},v-{default,solid},s-{default,lg}}`. */
export function classSource(names: Record<SafelistAxis, string[]>, axes = AXES) {
	return braces(axes.map(axis => `${axis}-${braces([...names[axis]].sort())}`));
}

/**
 * The `c-*`, `v-*` and `s-*` classes a config registers, for `@source inline("...")` in a Tailwind 4 stylesheet.
 * It runs without Tailwind, so it knows the palettes of the theme only by name: see `palettes`.
 * @param config the options, or the plugin `windiui()` made from them.
 */
export function safelistSource(config: Config | { handler: unknown } = {}, { axes, palettes = PALETTES }: SafelistOptions = {}) {
	const colors = Object.fromEntries([...palettes, 'default', 'accent'].flatMap(p => SHADES.map(s => [`${p}-${s}`, ''])));
	// Names do not depend on what the theme holds, only on which palettes it has.
	const theme: ThemeProvider = {
		colors: () => colors,
		spacing: () => '',
		fontSize: () => '',
		applyTextColor() {},
		applyBackgroundColor() {},
		applyBorderColor() {},
		colorValue: value => value,
	};

	const gt = create(unwrap(config)).generator(theme);
	return classSource({ c: gt.colors.names(), v: gt.variants.names(), s: gt.sizes.names() }, axes);
}
