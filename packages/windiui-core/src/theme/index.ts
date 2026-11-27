import { create, type Config, type Manifest } from '../index';
import { FALLBACK_PALETTES } from '../colors';
import { createThemeProvider, type Palette, type Palettes } from './provider';
import { parseColor, wcag2, type ContrastMetric } from './contrast';
import { adjustCurves, fitPalette, generatePalette, isPaletteSpec, parsePalette, resolvePalette, samplePalette, seedAnchor, type PaletteSpec, type ResolvePaletteOptions } from './palette';
import { createResolver, type ResolvedVariant } from './resolve';
import { calibrate, literalPalette, type CalibrateOptions, type CalibrationPolicy, type CalibrationResult } from './calibrate';
import { createDocuments, type StaticTheme, type ThemeDocument, type ToCssOptions, type ToStaticOptions } from './document';

export interface EngineOptions {
	/**
	 * The palettes of the theme, each its 11 shades as literal colors. Without `default` or `accent`, those are `gray`
	 * and `blue`, as in the plugin; when the palettes have neither, `createEngine` throws.
	 */
	palettes?: Palettes;
	/** The metric of `contrast`. Left out, the contrast ratio of WCAG 2. */
	metric?: ContrastMetric;
}

/** A color to calibrate: the name of a color of the engine, its 11 shades, or a palette spec. */
export type CalibrationColor = string | Palette | PaletteSpec;

export interface Engine {
	/** The names of the variants, as the `v-*` classes of the plugin. */
	variants(): string[];
	/** The names of the colors, as the `c-*` classes of the plugin; each also has a `c-accent-*` class. */
	colors(): string[];
	/**
	 * The names the config registers, as the plugin's `manifest` option writes them: the prefix, the colors (sorted),
	 * variants, sizes and components, and by variant the colors with an override. `manifestTypes` gives its types.
	 */
	manifest(): Manifest;
	/**
	 * What `variant` paints on an element of `color`: the shade, the literal color and the opacity of each color
	 * property, in light and dark mode, at rest and in each state, with the overrides of the config applied.
	 */
	resolve(variant: string, color: string): ResolvedVariant;
	/** The contrast of two literal colors, by the metric of the engine: the ratio of WCAG 2 unless one is given. */
	contrast(fg: string, bg: string): number;
	/**
	 * The overrides that make every variant on `colors` meet `policy`, light and dark, at rest and on hover, and a
	 * report of each cell that needed one. `colors` names colors of the engine, or maps a name to a color. Overrides
	 * of the engine's config win over the result, which holds only the differences.
	 */
	calibrate(colors: string[] | Record<string, CalibrationColor>, policy: CalibrationPolicy, options?: CalibrateOptions): CalibrationResult;
	/**
	 * Validates a theme document, such as one read from JSON, and returns a copy: its `version`, each color's palette
	 * spec, and overrides of known variants, with known props and shades as values. Throws with the path of the first
	 * field that is wrong, an unknown key included.
	 */
	parseTheme(json: unknown): ThemeDocument;
	/**
	 * The CSS variables of a theme document, on `selector`, light and dark: the 11 shades of each of its colors, which
	 * the config gives by `vars`, and the override variables each color given by `vars` forwards (`overrideVars`),
	 * where they change what the build paints. The document is validated first. Throws for a color of the document
	 * that the config does not give by `vars`.
	 */
	toCss(theme: ThemeDocument, options?: ToCssOptions): string;
	/**
	 * The literal colors of a theme document, as hex: for every color of the engine with literal shades and every
	 * color of the document, every variant, mode, state and color property, with its opacity painted over a backdrop.
	 */
	toStatic(theme: ThemeDocument, options?: ToStaticOptions): StaticTheme;
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
	const { colors, variants, manifest } = windiui.generator(createThemeProvider({ palettes }));
	// Without them the shades of `default` and `accent` in the root variables are not literal colors
	const missing = (Object.keys(FALLBACK_PALETTES) as (keyof typeof FALLBACK_PALETTES)[]).find(c => !colors.names(true).includes(c));
	if (options.palettes && missing) throw new Error(`WindiUI: the palettes have no "${missing}" or "${FALLBACK_PALETTES[missing]}" palette; add one, or set \`colors.${missing}\`.`);
	const { resolve, root } = createResolver(windiui.vars, colors, variants);
	const isColor = (color: string) => colors.names(true).includes(color) && !color.startsWith('accent-');
	const documents = createDocuments({ prefix: windiui.config.prefix, vars: windiui.vars, colors, variants, palettes, resolve, root, metric });

	const colorNames = () => {
		const names = colors.names();
		return names.filter(c => !(c.startsWith('accent-') && names.includes(c.slice(7))));
	};

	return {
		variants: () => variants.names(),
		colors: colorNames,
		manifest,

		resolve(variant, color) {
			if (!variants.names().includes(variant)) throw new Error(`WindiUI: unknown variant "${variant}".`);
			if (!isColor(color)) throw new Error(`WindiUI: unknown color "${color}".`);

			return resolve(variant, color, Object.fromEntries(colors.resolve(color)!));
		},

		contrast: (fg, bg) => metric(parseColor(fg), parseColor(bg)),

		calibrate(input, policy, opts) {
			const targets = (Array.isArray(input) ? input.map(c => [c, c] as const) : Object.entries(input)).map(([name, value]) => {
				let shades: Partial<Palette>;
				let anchor;
				if (typeof value === 'string') {
					if (!isColor(value)) throw new Error(`WindiUI: unknown color "${value}".`);
					shades = Object.fromEntries(colors.resolve(value)!);
					anchor = colors.anchors.get(value);
				} else {
					const spec = isPaletteSpec(value) ? value : { shades: value };
					shades = resolvePalette(spec, { palettes });
					if ('seed' in spec) anchor = seedAnchor(spec);
				}

				const palette = literalPalette(shades);
				if (!palette) throw new Error(`WindiUI: cannot calibrate "${name}": its shades are not literal colors.`);
				return { name, palette, anchor };
			});

			return calibrate({ variants: variants.names(), resolve, root, metric }, targets, policy, opts);
		},

		parseTheme: documents.parseTheme,
		toCss: documents.toCss,
		toStatic: documents.toStatic,

		resolvePalette: (spec, opts?: ResolvePaletteOptions) => resolvePalette(spec, { palettes, ...opts }),
		fitPalette,
		adjustCurves,
		samplePalette,
		parsePalette,
		generatePalette,
	};
}

export { createThemeProvider, type Palette, type Palettes, type ThemeProviderOptions } from './provider';
export type { ColorProperty, ResolvedColor, ResolvedMode, ResolvedState, ResolvedVariant } from './resolve';
export type {
	CalibrateOptions, CalibrationCell, CalibrationCheck, CalibrationFix, CalibrationPolicy, CalibrationReportEntry, CalibrationResult,
	CalibrationStrategy, CalibrationStrategyFunction
} from './calibrate';
export type { StaticMode, StaticState, StaticTheme, StaticVariant, ThemeCalibration, ThemeDocument, ToCssOptions, ToStaticOptions } from './document';
export { manifestTypes, type Manifest } from '../manifest';
export { parseColor, wcag2, type ContrastMetric, type Rgb } from './contrast';
export {
	resolvePalette, fitPalette, adjustCurves, samplePalette, parsePalette, generatePalette,
	type ChannelCurve, type PaletteAdjust, type PaletteBase, type PaletteCurves, type PaletteSpec, type ResolvePaletteOptions, type SamplePaletteOptions
} from './palette';
