import { cssVars, type CSSVarName } from './vars';
import { type BuilderContext, VarsGeneratorBase } from "./base";
import type { ColorValue, Config } from "./config";
import type { ApplyVariantMainProp, VariantsGenerator } from "./variants";
import type { CSS } from "./types";
import type { Palette } from "./theme/provider";
import { isPaletteSpec, resolvePalette } from "./theme/palette";

export type ColorShade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';
export type ExColorShade = ColorShade | `default-${ColorShade}` | `accent-${ColorShade}` | 'black' | 'white';
export type ColorVars = Record<CSSVarName<'c' | 'cv'>, string>;
export interface ColorCssVars extends ColorVars {
	'@dark'?: ColorVars;
}

export interface ColorContext {
	toValue(name: ExColorShade | (string & {}), alpha?: number | string): string;
}

export const COLOR_SHADES: ColorShade[] = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const COLOR_SHADE_REGEX = /50|950|[1-9]00/;
export const COLOR_SHADE_EX_REGEX = new RegExp(`^((?:(default|accent)-)?(${COLOR_SHADE_REGEX.source})|black|white)$`);
/** The theme method that paints each main property of `apply-v`, `btn` and `variantUtilities`. */
export const APPLY = { bg: 'applyBackgroundColor', border: 'applyBorderColor', text: 'applyTextColor' } as const;
/** The variant variable that each main property of `apply-v`, `btn` and `variantUtilities` reads. */
export const VAR_PROP = { bg: 'bg', border: 'border', text: 'fg' } as const;
const COLOR_PALETTE_REGEX = new RegExp(`^(.+)-(${COLOR_SHADE_REGEX.source})$`);

const FLAT_COLORS: Record<string, string> = {
	black: '#000',
	white: '#fff',
};

function getColorMap(colors: Record<string, string>, debug?: boolean) {
	const cMap = {
		palette: new Map<string, Map<ColorShade, string>>(),
		custom: new Map<string, string>()
	};

	for (const key in colors) {
		const value = colors[key];
		const mRes = COLOR_PALETTE_REGEX.exec(key);
		if (mRes) {
			const cName = mRes[1];
			if (cName === 'c') continue;

			if (!cMap.palette.has(cName)) {
				cMap.palette.set(cName, new Map());
			}

			cMap.palette.get(cName)!.set(mRes[2] as ColorShade, value);
		} else {
			cMap.custom.set(key, value);
		}
	}

	for (const [cName, shades] of cMap.palette) {
		if (shades.size !== 11) {
			if (debug) console.warn(`Color palette "${cName}" does not have all 11 shades (50, 100, ..., 950).`);
			cMap.palette.delete(cName);
			for (const [sKey, sVal] of shades) {
				cMap.custom.set(`${cName}-${sKey}`, sVal);
			}
		}
	}

	return cMap;
}

export class ColorsGenerator extends VarsGeneratorBase<Map<ColorShade, string>, ColorCssVars> implements ColorContext {
	private readonly colors: ReturnType<typeof getColorMap>;
	protected readonly items: Map<string, Map<ColorShade, string>>;
	/** The colors with a `c-*` class: `colors.only` and those of the builder. Left out, all of them. */
	private readonly only?: Set<string>;

	/** @param variants gives the override variables of each `c-*` class */
	constructor(ctx: BuilderContext, private readonly options: Pick<Config, 'default' | 'accent' | 'colors' | 'debug'>, private readonly variants: VariantsGenerator) {
		super(ctx);
		this.colors = getColorMap(this.theme.colors(), options.debug);
		this.items = this.colors.palette;

		const only = options.colors?.only;
		if (only) {
			this.only = new Set(only);
			// `:root` applies `default` and `accent` as `c-default` and `c-accent-accent`, with or without their classes
			variants.hasColor = c => this.only!.has(c) || c === 'default' || c === 'accent';
		}

		for (const name of ['default', 'accent'] as const) {
			const value = options[name];
			if (value == null) continue;

			const palette = this.resolve(value);
			if (!palette) throw new Error(`WindiUI: the \`${name}\` option does not give a palette.`);
			this.items.set(name, palette);
			this.alias(name, value);
		}
	}

	/** The 11 shades of a palette given by name, by CSS variables or as the shades themselves. */
	resolve(value: ColorValue): Map<ColorShade, string> | undefined {
		if (typeof value === 'string') {
			const palette = this.items.get(value);
			if (!palette) console.error(`Color "${value}" not found.`);
			return palette && new Map(palette);
		}

		if ('vars' in value) {
			return new Map(COLOR_SHADES.map(s => [s, `var(${value.vars}-${s})`]));
		}

		if (isPaletteSpec(value)) {
			// Unadjusted, a palette is an alias: its shades as the theme gives them, variables included
			if ('palette' in value && !value.adjust && !value.pins) return this.resolve(value.palette);

			const named = 'palette' in value ? this.items.get(value.palette) : undefined;
			// Tailwind 3's theme gives a color as its channels, `r g b`
			const literal = (color: string) => /^[\d.]+ [\d.]+ [\d.]+$/.test(color) ? `rgb(${color})` : color;
			const palettes = named && 'palette' in value ? { [value.palette]: Object.fromEntries([...named].map(([s, c]) => [s, literal(c)])) as Palette } : undefined;
			try {
				const shades = resolvePalette(value, { palettes });
				return new Map(COLOR_SHADES.map(s => [s, this.theme.toColor?.(shades[s]) ?? shades[s]]));
			} catch (e) {
				console.error((e as Error).message);
				return;
			}
		}

		const missing = COLOR_SHADES.filter(s => !value[s]);
		if (missing.length) {
			console.error(`A color needs all 11 shades; ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} missing.`);
			return;
		}

		return new Map(COLOR_SHADES.map(s => [s, this.theme.toColor?.(value[s]) ?? value[s]]));
	}

	addColor(name: string, value: ColorValue) {
		if (this.items.has(name)) {
			console.error(`"${name}" already exists.`);
			return;
		}

		this.setColor(name, value);
	}

	/** Adds a palette, or replaces the one of that name. */
	setColor(name: string, value: ColorValue) {
		const palette = this.resolve(value);
		if (palette) {
			this.items.set(name, palette);
			this.alias(name, value);
			this.only?.add(name);
		}
	}

	remove(name: string) {
		super.remove(name);
		if (!this.items.has(name)) this.variants.alias(name);
	}

	private alias(name: string, value: ColorValue) {
		this.variants.alias(name, typeof value === 'object' && 'vars' in value && value.overrideVars ? { ...value.overrideVars, vars: value.vars } : undefined);
	}

	/** @param all also the palettes that `colors.only` leaves without a class */
	names(all = false) {
		const cNames = super.names().filter(c => all || (this.only?.has(c) ?? true));
		cNames.push(...cNames.map(c => `accent-${c}`));
		return cNames;
	}

	/** The names of `colors.only` that are not palettes. */
	unknownOnly() {
		return (this.options.colors?.only ?? []).filter(c => !this.items.has(c));
	}

	cssVars(name: string) {
		let palette = this.items.get(name);
		let accentVars = false;

		if (!palette) {
			if (name.startsWith('accent-')) {
				name = name.replace(/^accent-/, '');
				palette = this.items.get(name);
				if (palette) {
					accentVars = true;
				} else {
					console.error(`Color "${name}" not found.`);
					return {};
				}
			} else {
				console.error(`Color "${name}" not found.`);
				return {};
			}

		}

		const cObj = Object.fromEntries(palette.entries());
		return { ...cssVars(cObj, n => this.vars.c(accentVars ? `accent-${n}` : n)), ...this.variants.colorVars(name, accentVars) };
	}

	rootVars() {
		const cRoot: ColorCssVars = {};
		for (const mn in FLAT_COLORS) {
			cRoot[this.vars.c(mn)] = this.colors.custom.get(mn) ?? FLAT_COLORS[mn];
		}

		const dc = super.rootVars();
		Object.assign(cRoot, dc);

		// The root is also `c-accent-accent`
		const { '@dark': accentDark, ...accent } = this.variants.colorVars('accent', true);
		Object.assign(cRoot, accent);
		if (accentDark) cRoot['@dark'] = { ...cRoot['@dark'], ...accentDark };

		const addPalette = (suffix: string, palette: Map<ColorShade, string>) => {
			for (const [shade, color] of palette) {
				cRoot[this.vars.c(`${suffix}-${shade}`)] = color;
			}
		};

		addPalette('default', this.items.get('default') ?? new Map<ColorShade, string>());
		addPalette('accent', this.items.get('accent') ?? new Map<ColorShade, string>());

		return cRoot;
	}

	/**
	 * `bg-{color}` and the like of `variantUtilities`: the value of `variant` for this color, overrides included, with
	 * its opacity unless `alpha` is given, light and dark. A shade is this palette's, not the element's `c-*` class.
	 */
	variantUtilCss(color: string, prop: ApplyVariantMainProp, variant: string, alpha?: string) {
		const palette = this.items.get(color);
		const values = palette && this.variants.colorValues(variant, color);
		if (!values) return {};

		const key = VAR_PROP[prop];
		const shade = new RegExp(`var\\(${this.vars.c('')}(${COLOR_SHADE_REGEX.source})\\)`, 'g');
		const paint = (v: Record<string, string>) => {
			const target: CSS.Properties = {};
			const value = v[key].replace(shade, (read, s: ColorShade) => palette.get(s) ?? read);
			this.theme[APPLY[prop]](value, target, alpha ?? v[`${key}-opacity`]);
			return target;
		};

		const { light, dark } = values;
		const css: CSS.Properties & { '@dark'?: CSS.Properties } = paint(light);
		if (key in dark || `${key}-opacity` in dark) css['@dark'] = paint({ ...light, ...dark });

		return css;
	}

	toValue(name: ExColorShade | (string & {}), alpha?: number | string) {
		return this.theme.colorValue(COLOR_SHADE_EX_REGEX.exec(name) ? this.vars.color(name as ExColorShade) : name, alpha);
	}
}
