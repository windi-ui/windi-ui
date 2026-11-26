import { create, type Config } from '../index';
import { COLOR_SHADES, COLOR_SHADE_EX_REGEX, FALLBACK_PALETTES, type ColorShade, type ExColorShade } from '../colors';
import { ACCENT_KEY, type VariantProperties } from '../variants';
import { createThemeProvider, type Palettes } from './provider';
import { parseColor, wcag2, type ContrastMetric } from './contrast';
import { adjustCurves, fitPalette, generatePalette, parsePalette, resolvePalette, samplePalette, type ResolvePaletteOptions } from './palette';

export interface EngineOptions {
	/**
	 * The palettes of the theme, each its 11 shades as literal colors. Without `default` or `accent`, those are `gray`
	 * and `blue`, as in the plugin; when the palettes have neither, `createEngine` throws.
	 */
	palettes?: Palettes;
	/** The metric of `contrast`. Left out, the contrast ratio of WCAG 2. */
	metric?: ContrastMetric;
}

/** A color property of a variant, such as `bg` or `fg-soft`. */
export type ColorProperty = Exclude<keyof VariantProperties, `${string}-opacity`>;

export interface ResolvedColor {
	/** The shade the value comes to, such as `'600'`, `'white'` or `'accent-600'`; left out for a literal color. */
	shade?: ExColorShade;
	/** The literal color, or the variable a palette given by CSS variables reads. */
	color: string;
	/** The opacity of the property, from 0 to 1. */
	opacity: number;
}

/** The colors of a variant on one color, in one mode and state. */
export type ResolvedState = Record<ColorProperty, ResolvedColor>;

/** The states of a variant: at rest, on hover, and in every other state the variant sets, by name without the colon. */
export type ResolvedMode = Record<'rest' | 'hover', ResolvedState> & Partial<Record<string, ResolvedState>>;

export interface ResolvedVariant {
	light: ResolvedMode;
	dark: ResolvedMode;
}

export interface Engine {
	/** The names of the variants, as the `v-*` classes of the plugin. */
	variants(): string[];
	/** The names of the colors, as the `c-*` classes of the plugin; each also has a `c-accent-*` class. */
	colors(): string[];
	/**
	 * What `variant` paints on an element of `color`: the shade, the literal color and the opacity of each color
	 * property, in light and dark mode, at rest and in each state, with the overrides of the config applied.
	 */
	resolve(variant: string, color: string): ResolvedVariant;
	/** The contrast of two literal colors, by the metric of the engine: the ratio of WCAG 2 unless one is given. */
	contrast(fg: string, bg: string): number;
	/** `resolvePalette`, where a `palette` base names a palette of the engine unless `options` give other palettes. */
	resolvePalette: typeof resolvePalette;
	/** `fitPalette`: the curves nearest to a ramp. */
	fitPalette: typeof fitPalette;
	/** `adjustCurves`: the curves with an adjustment applied. */
	adjustCurves: typeof adjustCurves;
	/** `samplePalette`: the 11 shades of the curves, with the pins applied. */
	samplePalette: typeof samplePalette;
	/** `parsePalette`: validates a palette spec; throws with the path of the field out of bounds. */
	parsePalette: typeof parsePalette;
	/** `generatePalette`: the 11 shades for one brand color. */
	generatePalette: typeof generatePalette;
}

const PROPS = (['bg', 'border', 'fg'] as const).flatMap(p => [p, `${p}-soft`, `${p}-muted`, `${p}-accent`] as const);

/**
 * The theme engine: what the Tailwind plugin knows, without Tailwind. It runs the presets and `build` of `config` on
 * the same generators, over the palettes of `options`, such as `tailwind4` from `@windi-ui/tailwind/palettes`.
 */
export function createEngine(config: Config = {}, { metric = wcag2, ...options }: EngineOptions = {}): Engine {
	const palettes = { ...options.palettes };
	for (const [name, fallback] of Object.entries(FALLBACK_PALETTES)) {
		const palette = palettes[name] ?? palettes[fallback];
		if (palette) palettes[name] = palette;
	}

	const windiui = create(config);
	const { vars } = windiui;
	const { colors, variants } = windiui.generator(createThemeProvider({ palettes }));
	// Without them the shades of `default` and `accent` in the root variables are not literal colors
	const missing = (Object.keys(FALLBACK_PALETTES) as (keyof typeof FALLBACK_PALETTES)[]).find(c => !colors.names(true).includes(c));
	if (options.palettes && missing) throw new Error(`WindiUI: the palettes have no "${missing}" or "${FALLBACK_PALETTES[missing]}" palette; add one, or set \`colors.${missing}\`.`);
	// The root variables hold the shades of `default`, `accent`, `black` and `white`; read when one is resolved
	let root: Record<string, string> | undefined;
	const shadeRef = new RegExp(`^var\\(${vars.c('')}([^,()\\s]+)\\)$`);
	const variantRef = vars.v('');

	const colorNames = () => {
		const names = colors.names();
		return names.filter(c => !(c.startsWith('accent-') && names.includes(c.slice(7))));
	};

	return {
		variants: () => variants.names(),
		colors: colorNames,

		resolve(variant, color) {
			if (!variants.names().includes(variant)) throw new Error(`WindiUI: unknown variant "${variant}".`);
			if (!colors.names(true).includes(color) || color.startsWith('accent-')) throw new Error(`WindiUI: unknown color "${color}".`);

			const palette = colors.resolve(color)!;
			// A value the variant leaves out is the default variant's, as the `*` rule or the `var()` fallback gives it
			// The `-accent` overrides are set by `c-accent-*`, so on the element they are those `:root` sets as `c-accent-accent`
			const layers = [...new Set(['default', variant])].map(v => {
				const [own, root] = [variants.colorValues(v, color)!, variants.colorValues(v, 'accent')!];
				const pick = (mode: 'light' | 'dark') => Object.fromEntries([
					...Object.entries(own[mode]).filter(([k]) => !ACCENT_KEY.test(k)),
					...Object.entries(root[mode]).filter(([k]) => ACCENT_KEY.test(k)),
				]);
				return { light: pick('light'), dark: pick('dark') };
			});
			const light = layers.reduce<Record<string, string>>((values, l) => ({ ...values, ...l.light }), {});
			const dark = layers.reduce<Record<string, string>>((values, l) => ({ ...values, ...l.light, ...l.dark }), {});

			const resolveMode = (values: Record<string, string>): ResolvedMode => {
				// To a shade reference or a literal: a variable of the variant is read, an unset one gives its fallback
				const read = (value: string | undefined, seen: string[] = []): string | undefined => {
					const [, name, fallback] = /^var\((--[^,()\s]+)(?:,\s*([\s\S]+))?\)$/.exec(value ?? '') ?? [];
					if (!name || shadeRef.test(value!)) return value;

					const key = name.startsWith(variantRef) ? name.slice(variantRef.length).replace(/\\(.)/g, '$1') : undefined;
					return key && key in values && !seen.includes(key) ? read(values[key], [...seen, key]) : read(fallback, seen);
				};

				const state = (suffix: string): ResolvedState => Object.fromEntries(PROPS.map(prop => {
					const value = read(values[`${prop}${suffix}`] ?? values[prop]) ?? '';
					const main = prop.split('-')[0];
					const opacity = Number(read(values[`${main}-opacity${suffix}`] ?? values[`${main}-opacity`]) ?? 1);

					const shade = shadeRef.exec(value)?.[1];
					if (!shade || !COLOR_SHADE_EX_REGEX.test(shade)) return [prop, { color: value, opacity }];

					const literal = COLOR_SHADES.includes(shade as ColorShade) ? palette.get(shade as ColorShade) : (root ??= colors.rootVars() as Record<string, string>)[vars.c(shade)];
					return [prop, { shade: shade as ExColorShade, color: literal ?? value, opacity }];
				})) as ResolvedState;

				const pseudos = new Set(Object.keys(values).flatMap(k => /-:([\w-]+)$/.exec(k)?.[1] ?? []));
				pseudos.add('hover');
				return Object.fromEntries([['rest', state('')], ...[...pseudos].map(p => [p, state(`-:${p}`)])]) as ResolvedMode;
			};

			return { light: resolveMode(light), dark: resolveMode(dark) };
		},

		contrast: (fg, bg) => metric(parseColor(fg), parseColor(bg)),

		resolvePalette: (spec, opts?: ResolvePaletteOptions) => resolvePalette(spec, { palettes, ...opts }),
		fitPalette,
		adjustCurves,
		samplePalette,
		parsePalette,
		generatePalette,
	};
}

export { createThemeProvider, type Palette, type Palettes, type ThemeProviderOptions } from './provider';
export { parseColor, wcag2, type ContrastMetric, type Rgb } from './contrast';
export {
	resolvePalette, fitPalette, adjustCurves, samplePalette, parsePalette, generatePalette,
	type ChannelCurve, type PaletteAdjust, type PaletteBase, type PaletteCurves, type PaletteSpec, type ResolvePaletteOptions, type SamplePaletteOptions
} from './palette';
