import { COLOR_SHADES, COLOR_SHADE_EX_REGEX, type ColorShade, type ColorsGenerator, type ExColorShade } from '../colors';
import type { VariantOverride, VariantProperties, VariantsGenerator } from '../variants';
import type { VarsProvider } from '../vars';
import type { Palette } from './provider';

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

const PROPS = (['bg', 'border', 'fg'] as const).flatMap(p => [p, `${p}-soft`, `${p}-muted`, `${p}-accent`] as const);

/** Tailwind 3's theme gives a color as its channels, `r g b`; anything else is returned as it is. */
export const literal = (color: string) => /^[\d.]+ [\d.]+ [\d.]+$/.test(color) ? `rgb(${color})` : color;

/**
 * Resolves variants as an element of a color reads them, over the generators of one build: `variant` on `color`,
 * whose shades are `palette`, with `extra` added under the color's overrides and `over` over them. `root` gives the literal of a shade of
 * the root variables, such as `white` or `default-950`.
 */
export function createResolver(vars: VarsProvider, colors: ColorsGenerator, variants: VariantsGenerator) {
	// The root variables hold the shades of `default`, `accent`, `black` and `white`; read when one is resolved
	let rootVars: Record<string, string> | undefined;
	const root = (shade: string): string | undefined => {
		const value = (rootVars ??= colors.rootVars() as Record<string, string>)[vars.c(shade)];
		return value && literal(value);
	};
	const shadeRef = new RegExp(`^var\\(${vars.c('')}([^,()\\s]+)\\)$`);
	const variantRef = vars.v('');

	const resolve = (variant: string, color: string, palette: Partial<Palette>, extra?: VariantOverride, over?: VariantOverride): ResolvedVariant => {
		// A value the variant leaves out is the default variant's, as the `*` rule or the `var()` fallback gives it
		const layers = [...new Set(['default', variant])].map(v => v === variant ? variants.colorValues(v, color, extra, over)! : variants.colorValues(v, color)!);
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

				const own = COLOR_SHADES.includes(shade as ColorShade) ? palette[shade as ColorShade] : root(shade);
				return [prop, { shade: shade as ExColorShade, color: own ?? value, opacity }];
			})) as ResolvedState;

			const pseudos = new Set(Object.keys(values).flatMap(k => /-:([\w-]+)$/.exec(k)?.[1] ?? []));
			pseudos.add('hover');
			return Object.fromEntries([['rest', state('')], ...[...pseudos].map(p => [p, state(`-:${p}`)])]) as ResolvedMode;
		};

		return { light: resolveMode(light), dark: resolveMode(dark) };
	};

	return { resolve, root };
}
