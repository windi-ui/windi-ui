import { COLOR_SHADES, COLOR_SHADE_EX_REGEX, type ColorShade, type ColorsGenerator } from '../colors';
import { merge, type VariantOverride, type VariantsGenerator } from '../variants';
import type { VarsProvider } from '../vars';
import { calibrate, literalPalette, over, type CalibrateOptions, type CalibrationPolicy } from './calibrate';
import { parseColor, parseOklch, type ContrastMetric, type Rgb } from './contrast';
import { parseSpec, resolvePalette, seedAnchor, toHex, toOklch, type PaletteSpec } from './palette';
import type { Palette, Palettes } from './provider';
import type { ColorProperty, ResolvedMode, ResolvedVariant, createResolver } from './resolve';

/** A theme as one JSON document: a palette spec per color, a radius and per-color overrides of variants. */
export interface ThemeDocument {
	/** The version of the shape. There is one, `1`. */
	version: 1;
	/** A palette spec per color, such as `{ primary: { seed: '#2563eb' } }`. */
	colors?: Record<string, PaletteSpec>;
	/** A length, such as `'0.25rem'`, which `toCss` writes as `--wui-radius`. */
	radius?: string;
	/** Per-color overrides of variants, in the shape of the `overrides` option, with shades as values. */
	overrides?: Record<string, Record<string, VariantOverride>>;
}

/** A policy and the strategy to calibrate the colors of a theme document with. */
export type ThemeCalibration = CalibrationPolicy & CalibrateOptions;

export interface ToCssOptions {
	/** Where the variables are declared. Left out, `:root`. */
	selector?: string;
	/**
	 * What dark mode follows: a selector such as `'.dark'`, compounded with `selector`, or `'media'`, the
	 * `prefers-color-scheme` media query. Left out, `'media'`.
	 */
	darkSelector?: string;
	/** Also writes `initial` for every override variable it does not set, so that a scope does not take the page's. */
	reset?: boolean;
	/** Override variables written even where they equal the variant's value, as `'variant.prop'`: `'solid.bg'`. */
	always?: string[];
	/** Calibrates the colors of the document first; its overrides win over the result. */
	calibrate?: ThemeCalibration;
	/** Writes each shade as RGB channels, such as `37 99 235`, as Tailwind 3 reads the variables of a palette. */
	channels?: boolean;
}

export interface ToStaticOptions {
	/**
	 * What a translucent color is painted over, per mode: a literal color or a shade of the root variables. Left out,
	 * `white` in light mode and `default-950` in dark.
	 */
	backdrop?: { light?: string, dark?: string };
	/** Calibrates the colors of the document first, as `toCss` does. */
	calibrate?: ThemeCalibration;
}

/** The literal colors of a variant on one color, in one mode and state, as hex. */
export type StaticState = Record<ColorProperty, string>;
/** `rest`, `hover` and the other states of the variant, as `ResolvedMode` names them. */
export type StaticMode = Record<'rest' | 'hover', StaticState> & Partial<Record<string, StaticState>>;
export interface StaticVariant {
	light: StaticMode;
	dark: StaticMode;
}
/** The literal colors of a theme, by color, then variant. */
export type StaticTheme = Record<string, Record<string, StaticVariant>>;

/** What the documents of an engine resolve with. */
export interface DocumentContext {
	/** The prefix of WindiUI's variables. */
	prefix: string;
	vars: VarsProvider;
	colors: ColorsGenerator;
	variants: VariantsGenerator;
	/** The palettes a `palette` base names. */
	palettes: Palettes;
	resolve: ReturnType<typeof createResolver>['resolve'];
	root(shade: string): string | undefined;
	metric: ContrastMetric;
}

type Mode = 'light' | 'dark';

const PROPS = (['bg', 'border', 'fg'] as const).flatMap(p => ['', '-soft', '-muted', '-accent', '-opacity'].map(s => `${p}${s}`));
const NAME = /^[a-z][\w-]*$/i;
const STATE = /^:[a-z][a-z-]*$/;
const OPACITY = /^(0|1|0\.\d+)$/;
const LENGTH = /^(0|\d*\.?\d+(px|rem|em))$/;

const own = <T>(record: Record<string, T> | undefined, key: string) => record && Object.hasOwn(record, key) ? record[key] : undefined;

/**
 * Validates a theme document, such as one read from JSON, against the variants of an engine, and returns a copy.
 * Throws with the path of the first field that is wrong.
 */
export function parseTheme(json: unknown, variants: string[]): ThemeDocument {
	const fail = (path: string, problem: string): never => {
		throw new Error(`WindiUI: invalid theme at \`${path || '(root)'}\`: ${problem}.`);
	};
	const join = (path: string, key: string) => path ? `${path}.${key}` : key;
	const object = (value: unknown, path: string, keys?: readonly string[]) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail(path, 'must be an object');
		const unknown = keys && Object.keys(value).find(k => !keys.includes(k));
		if (unknown) fail(join(path, unknown), 'is not a known key');
		return value as Record<string, unknown>;
	};
	const name = (value: string, path: string) => NAME.test(value) ? value : fail(path, 'must be a color name, such as `primary`');

	const override = (value: unknown, path: string, keys: string[]): VariantOverride => Object.fromEntries<unknown>(Object.entries(object(value, path, keys)).map(([k, v]) => {
		const at = join(path, k);
		if (k === 'dark') return [k, override(v, at, [...PROPS, 'pseudos'])];
		if (k === 'pseudos') {
			return [k, Object.fromEntries(Object.entries(object(v, at)).map(([state, props]) => {
				if (!STATE.test(state)) fail(join(at, state), 'must be a state, such as `:hover`');
				return [state, override(props, join(at, state), PROPS)];
			}))];
		}
		if (k.endsWith('-opacity')) return [k, typeof v === 'string' && OPACITY.test(v) ? v : fail(at, 'must be an opacity from `0` to `1`, such as `\'0.5\'`')];
		return [k, typeof v === 'string' && COLOR_SHADE_EX_REGEX.test(v) ? v : fail(at, 'must be a shade, such as `700`, `accent-600` or `white`')];
	}));

	const root = object(json, '', ['version', 'colors', 'radius', 'overrides']);
	if (root.version !== 1) fail('version', 'version' in root ? 'must be 1' : 'is missing');

	const theme: ThemeDocument = { version: 1 };
	if ('colors' in root) {
		theme.colors = Object.fromEntries(Object.entries(object(root.colors, 'colors')).map(([color, spec]) => {
			const at = `colors.${name(color, `colors.${color}`)}`;
			return [color, parseSpec(spec, (path, problem) => fail(join(at, path), problem))];
		}));
	}
	if ('radius' in root) {
		theme.radius = typeof root.radius === 'string' && LENGTH.test(root.radius) ? root.radius : fail('radius', 'must be a length in `px`, `rem` or `em`, such as `0.25rem`');
	}
	if ('overrides' in root) {
		theme.overrides = Object.fromEntries(Object.entries(object(root.overrides, 'overrides')).map(([variant, byColor]) => {
			if (!variants.includes(variant)) fail(`overrides.${variant}`, 'is not a known variant');
			return [variant, Object.fromEntries(Object.entries(object(byColor, `overrides.${variant}`)).map(([key, value]) => {
				const at = `overrides.${variant}.${key}`;
				for (const color of key.split(',')) name(color.trim(), at);
				return [key, override(value, at, [...PROPS, 'pseudos', 'dark'])];
			}))];
		}));
	}

	return theme;
}

/** `parseTheme`, `toCss` and `toStatic` over the generators of an engine. */
export function createDocuments(ctx: DocumentContext) {
	const { colors, variants, vars } = ctx;

	// Every color of the engine, those `colors.only` leaves without a class included, but no `accent-*` copy
	const names = () => {
		const all = colors.names(true);
		return all.filter(c => !(c.startsWith('accent-') && all.includes(c.slice(7))));
	};

	// The prefix of a palette given by CSS variables, from its shades: `var(--ui-color-primary-50)` and so on
	const varsOf = (color: string) => {
		const shades = colors.resolve(color)!;
		const prefix = /^var\((--[\w-]+)-50\)$/.exec(shades.get('50') ?? '')?.[1];
		return prefix && COLOR_SHADES.every(s => shades.get(s) === `var(${prefix}-${s})`) ? prefix : undefined;
	};

	const parse = (json: unknown) => parseTheme(json, variants.names());

	/** The document validated, its palettes, and each variant resolved on a color with the document applied. */
	function prepare(json: unknown, policy?: ThemeCalibration) {
		const theme = parse(json);
		const specs = Object.entries(theme.colors ?? {});
		const palettes = new Map(specs.map(([name, spec]) => [name, resolvePalette(spec, { palettes: ctx.palettes })]));

		// The overrides of the document for a color, a list of colors included, a later key over an earlier one
		const overrides = (variant: string, color: string) => {
			let result: VariantOverride | undefined;
			for (const [key, value] of Object.entries(own(theme.overrides, variant) ?? {})) {
				if (key.split(',').some(c => c.trim() === color)) merge(result ??= {}, value, false);
			}
			return result;
		};

		// A shade of `default` or `accent` is the document's where it gives that palette
		const root = (shade: string) => {
			const [, palette, s] = /^(default|accent)-(\d+)$/.exec(shade) ?? [];
			return (palette ? palettes.get(palette)?.[s as ColorShade] : undefined) ?? ctx.root(shade);
		};

		let calibrated: Record<string, Record<string, VariantOverride>> = {};
		if (policy) {
			const { strategy, ...rest } = policy;
			const targets = specs.map(([name, spec]) => {
				const palette = literalPalette(palettes.get(name)!);
				if (!palette) throw new Error(`WindiUI: cannot calibrate "${name}": its shades are not literal colors.`);
				return { name, palette, anchor: 'seed' in spec ? seedAnchor(spec) : undefined };
			});
			calibrated = calibrate({ variants: variants.names(), resolve: (v, c, p, extra) => ctx.resolve(v, c, p, extra, overrides(v, c)), root, metric: ctx.metric }, targets, rest, { strategy }).overrides;
		}

		// Calibration under the overrides of the config, and the document's over them, as the CSS of `toCss` gives them
		const resolve = (variant: string, color: string, palette: Partial<Palette> = {}) =>
			ctx.resolve(variant, color, palette, own(calibrated[variant], color), overrides(variant, color));

		return { theme, palettes, root, resolve };
	}

	/**
	 * The CSS value of `key` of a variant, such as `bg-:hover`, in one mode: a shade of the color is a variable of the
	 * palette, any other shade a root variable of WindiUI. `undefined` when there is nothing to write.
	 */
	const valueOf = (mode: ResolvedMode, key: string, prefix: string, format: (color: string) => string) => {
		const [, prop, state] = /^(.+?)(?:-:(.+))?$/.exec(key)!;
		const values = mode[state ?? 'rest'];
		if (!values) return;
		if (prop.endsWith('-opacity')) return String(values[prop.slice(0, -8) as ColorProperty].opacity);

		const resolved = values[prop as ColorProperty];
		if (!resolved) return;
		if (!resolved.shade) {
			try {
				return format(resolved.color);
			} catch {
				return;
			}
		}

		// On `c-accent-*` an `-accent` value is the color's own shade
		const shade = (prop.endsWith('-accent') ? /^accent-(\d+)$/ : /^(\d+)$/).exec(resolved.shade)?.[1];
		return shade ? `var(${prefix}-${shade})` : vars.color(resolved.shade);
	};

	function toCss(json: unknown, { selector = ':root', darkSelector = 'media', reset = false, always = [], calibrate: policy, channels = false }: ToCssOptions = {}) {
		const { theme, palettes, resolve } = prepare(json, policy);
		// Only values the engine writes: a color of the document is read, then written again
		const format = (color: string) => {
			if (channels) return parseColor(color).map(v => Math.round(v * 255)).join(' ');
			const lch = parseOklch(color);
			return lch ? toOklch(lch) : toHex(parseColor(color));
		};

		const prefixes = new Map(names().flatMap(c => {
			const prefix = varsOf(c);
			return prefix ? [[c, prefix] as const] : [];
		}));
		for (const name of palettes.keys()) {
			if (!prefixes.has(name)) throw new Error(`WindiUI: toCss cannot write "${name}": it is not a color given by \`vars\`.`);
		}

		const light: [string, string][] = theme.radius ? [[`--${ctx.prefix}-radius`, theme.radius]] : [];
		const dark: [string, string][] = [];
		for (const [color, prefix] of prefixes) {
			const palette = palettes.get(color);
			if (palette) for (const s of COLOR_SHADES) light.push([`${prefix}-${s}`, format(palette[s])]);

			for (const variant of variants.names()) {
				const pairs = variants.forwarded(variant, color);
				if (!pairs) continue;

				// Unset, the variable gives what the build gives
				const [base, doc] = [ctx.resolve(variant, color, {}), resolve(variant, color)];
				for (const [key, variable] of pairs) {
					const pick = always.includes(`${variant}.${key}`);
					const [l, d] = (['light', 'dark'] as const).map((mode: Mode) => {
						const value = valueOf(doc[mode], key, prefix, format);
						return pick || value !== valueOf(base[mode], key, prefix, format) ? value : undefined;
					});

					if (l != null) light.push([variable, l]);
					else if (reset) light.push([variable, 'initial']);
					// The variable is the same in both modes: dark sets it where it differs, or unsets the light value
					if (d != null ? d !== l : l != null) dark.push([variable, d ?? 'initial']);
				}
			}
		}

		const list = (s: string) => s.split(/,(?![^()]*\))/).map(p => p.trim());
		const block = (sel: string, decls: [string, string][], indent = '') =>
			`${indent}${sel} {\n${decls.map(([p, v]) => `${indent}  ${p}: ${v};\n`).join('')}${indent}}\n`;

		let css = light.length ? block(selector, light) : '';
		if (dark.length) {
			// Compounded: `:where(.dark, .dark *)` alone has no specificity, and `<html class="dark">` would keep the light value
			const where = `:where(${list(darkSelector).flatMap(d => [d, `${d} *`]).join(', ')})`;
			css += darkSelector === 'media'
				? `@media (prefers-color-scheme: dark) {\n${block(selector, dark, '  ')}}\n`
				: block(list(selector).map(s => `${s}${where}`).join(', '), dark);
		}

		return css;
	}

	function toStatic(json: unknown, { backdrop = {}, calibrate: policy }: ToStaticOptions = {}): StaticTheme {
		const { palettes, root, resolve } = prepare(json, policy);
		const rgb = (color: string, what: string) => {
			try {
				return parseColor(color);
			} catch {
				throw new Error(`WindiUI: toStatic needs a literal color for ${what}, not "${color}"; give its palette in the document.`);
			}
		};
		const backdrops = { light: backdrop.light ?? 'white', dark: backdrop.dark ?? 'default-950' };

		const engine = names();
		return Object.fromEntries([...new Set([...engine, ...palettes.keys()])].flatMap(color => {
			// A palette given by CSS variables that the document leaves out has no literal colors
			const palette = palettes.get(color) ?? (engine.includes(color) ? literalPalette(Object.fromEntries(colors.resolve(color)!)) : undefined);
			if (!palette) return [];

			const paint = (resolved: ResolvedVariant, mode: Mode): StaticMode => {
				const under = rgb(root(backdrops[mode]) ?? backdrops[mode], `the ${mode} backdrop`);
				return Object.fromEntries(Object.entries(resolved[mode]).map(([state, values]) => {
					const at = (prop: ColorProperty, behind: Rgb) => {
						const { shade, color: value, opacity } = values![prop];
						const literal = !shade ? value : COLOR_SHADES.includes(shade as ColorShade) ? palette[shade as ColorShade] : root(shade) ?? shade;
						return over(rgb(literal, `"${shade ?? value}"`), opacity, behind);
					};
					// Text and borders are painted over the background, which a browser paints under the border too
					const bg = at('bg', under);
					return [state, Object.fromEntries((Object.keys(values!) as ColorProperty[]).map(p => [p, toHex(at(p, p.startsWith('bg') ? under : bg))]))];
				})) as StaticMode;
			};

			return [[color, Object.fromEntries(variants.names().map(variant => {
				const resolved = resolve(variant, color, palette);
				return [variant, { light: paint(resolved, 'light'), dark: paint(resolved, 'dark') }];
			}))]];
		}));
	}

	return { parseTheme: parse, toCss, toStatic };
}
