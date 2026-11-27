import type { CSS } from "./types";
import { type VarsProvider, type CSSVarName, type CSSVarValue, cssVars } from "./vars";
import { type BuilderContext, VarsGeneratorBase } from "./base";
import type { OverrideMode, OverrideVars, VariantScope } from "./config";
import { APPLY, COLOR_SHADE_EX_REGEX, VAR_PROP, type ColorCssVars, type ColorShade, type ExColorShade } from "./colors";
import { cssEsc } from "./utils";

export type VariantVars = Record<CSSVarName<'v'>, string>;
/** A shade of the color or another variable, such as `var(--wui-c-600)`, or any color, such as `#fff`. */
export type VariantPropValue = CSSVarValue<'c'> | CSSVarValue<'v'> | (string & {});
export type OpacityValue = '1' | '0' | `0.${number}`;

export interface VariantProperties {
	'bg': VariantPropValue;
	'bg-soft'?: VariantPropValue;
	'bg-muted'?: VariantPropValue;
	'bg-accent'?: VariantPropValue;
	'bg-opacity'?: OpacityValue;

	'border': VariantPropValue;
	'border-soft'?: VariantPropValue;
	'border-muted'?: VariantPropValue;
	'border-accent'?: VariantPropValue;
	'border-opacity'?: OpacityValue;

	'fg': VariantPropValue;
	'fg-soft'?: VariantPropValue;
	'fg-muted'?: VariantPropValue;
	'fg-accent'?: VariantPropValue;
	'fg-opacity'?: OpacityValue;
}

/** States of headless component libraries, offered by autocomplete. */
type CommonState =
	| '[data-state=open]' | '[data-state=closed]' | '[data-state=checked]' | '[data-state=active]' | '[data-state=on]'
	| '[data-highlighted]' | '[data-selected]' | '[data-disabled]' | '[data-placeholder]'
	| '[aria-invalid=true]' | '[aria-selected=true]' | '[aria-expanded=true]' | '[aria-checked=true]'
	| '[aria-pressed=true]' | '[aria-current=page]';

/**
 * A state of a variant: a pseudo-class such as `':hover'`, or any selector the element itself can match, such as
 * `'[data-state=open]'` or `':hover:not([data-disabled])'`.
 */
export type VariantState = CSS.SimplePseudos | CommonState | (string & {});

type VariantPseudos = Partial<Record<VariantState, Partial<VariantProperties>>>;
export interface Variant extends VariantProperties {
	pseudos?: VariantPseudos;
	dark?: Omit<Partial<Variant>, 'dark' | 'colors'>;
	/** Values of the variant for some colors, by color name; `'amber,lime'` names several. */
	colors?: Record<string, VariantOverride>;
}

type WithShades<T> = { [K in keyof T]?: NonNullable<T[K]> extends string ? T[K] | ExColorShade : WithShades<NonNullable<T[K]>> };

/**
 * Any values of a variant, `pseudos` and `dark` included, for some colors. A value is a reference or a shade of the
 * color: `'700'`, `'accent-600'`, `'white'`.
 */
export type VariantOverride = WithShades<Omit<Variant, 'colors'>>;

/** A property, or its value in a state: `bg-:hover` for a pseudo-class, `bg-open` for a state named `open`. */
export type VariantProperty = keyof VariantProperties | `${keyof VariantProperties}-${CSS.SimplePseudos}` | `${keyof VariantProperties}-${string & {}}`;
export type ApplyVariantMainProp = 'bg' | 'border' | 'text';
export type ApplyVariantSubProp = 'soft' | 'muted' | 'accent' | 'default';
export type ApplyVariantProp = ApplyVariantMainProp | `${ApplyVariantMainProp}-${Exclude<ApplyVariantSubProp, 'default'>}`;

export type ApplyVariant = boolean | ApplyVariantProp[];
export type ApplyVariantPseudos = Partial<Record<VariantState, ApplyVariant>> | VariantState[] | false;

export interface VariantCssVars extends VariantVars {
	'@dark'?: VariantVars;
	/** The rules of the `compound` override mode, such as `&.c-yellow` */
	[compound: `&.${string}`]: VariantVars & { '@dark'?: VariantVars };
}

/** Values by key: `bg` for a property, `bg-:hover` for its value in a state. */
type Values = Record<string, string>;
interface Flat { light: Values, dark: Values }

export const ACCENT_KEY = /^(bg|border|fg)-accent(-|$)/;
/** The property of a key: `bg-soft` of `bg-soft-:hover` and of `bg-soft-open`. */
const PROP_KEY = /^(bg|border|fg)(-(soft|muted|accent|opacity))?(?=-|$)/;
/** A pseudo-class or pseudo-element without arguments, whose state keeps its name, escaped: `--wui-v-bg-\:hover`. */
const SIMPLE_PSEUDO = /^::?[\w-]+$/;

const APPLY_PROPS = (['bg', 'border', 'text'] as const).flatMap(p => [p, `${p}-soft`, `${p}-muted`, `${p}-accent`] as const);
/** The states `apply-v-[...]` takes, by name without the colon. */
const APPLY_STATES: CSS.SimplePseudos[] = [
	':hover', ':focus', ':focus-visible', ':focus-within', ':active', ':visited', ':target', ':checked', ':indeterminate',
	':disabled', ':enabled', ':invalid', ':valid', ':user-invalid', ':user-valid', ':required', ':optional', ':read-only',
	':placeholder-shown', ':autofill', ':open',
];

export interface VariantContext {
	apply(
		v?: ApplyVariant,
		pseudos?: ApplyVariantPseudos,
		target?: CSS.Properties
	): CSS.Properties;

	/**
	 * Outside the `universal` scope, gives every bare `var()` read of a variant variable in `css` the default
	 * variant's value, light or dark, as its fallback.
	 */
	withFallback<T extends CSS.Properties>(css: T): T;
}

export function defaultVariant(vars: VarsProvider): Variant {
	return {
		'bg': vars.color('white'),
		'bg-soft': vars.color('100'),
		'bg-muted': vars.color('200'),
		'bg-accent': vars.color.accent('100'),
		'bg-opacity': '1',

		'border': vars.color('500'),
		'border-soft': vars.color('400'),
		'border-muted': vars.color('300'),
		'border-accent': vars.color.accent('500'),
		'border-opacity': '1',

		'fg': vars.color('800'),
		'fg-soft': vars.color('500'),
		'fg-muted': vars.color('400'),
		'fg-accent': vars.color.accent('700'),
		'fg-opacity': '1',

		pseudos: {
			':hover': {
				'bg': vars.color('100'),
				'bg-soft': vars.color('200'),
				'bg-muted': vars.color('300'),
				'bg-accent': vars.color.accent('200'),
			}
		},

		dark: {
			'bg': vars.color('950'),
			'bg-soft': vars.color('900'),
			'bg-muted': vars.color('800'),
			'bg-accent': vars.color.accent('900'),

			'border': vars.color('700'),
			'border-soft': vars.color('600'),
			'border-muted': vars.color('500'),
			'border-accent': vars.color.accent('700'),

			'fg': vars.color('200'),
			'fg-soft': vars.color('300'),
			'fg-muted': vars.color('400'),
			'fg-accent': vars.color.accent('200'),

			'pseudos': {
				':hover': {
					'bg': vars.color('900'),
					'bg-soft': vars.color('800'),
					'bg-muted': vars.color('700'),
					'bg-accent': vars.color.accent('900'),
				}
			}
		}
	};
}

export function mainVariants(vars: VarsProvider): Record<string, Variant> {
	return {
		solid: {
			'bg': vars.color('600'),
			'bg-soft': vars.color('500'),
			'bg-muted': vars.color('400'),
			'bg-accent': vars.color.accent('600'),
			'bg-opacity': '1',

			'border': vars.color('600'),
			'border-soft': vars.color('500'),
			'border-muted': vars.color('400'),
			'border-accent': vars.color.accent('600'),
			'border-opacity': '0',

			'fg': vars.color('white'),
			'fg-soft': vars.color('200'),
			'fg-muted': vars.color('300'),
			'fg-accent': vars.color.accent('200'),
			'fg-opacity': '1',

			pseudos: {
				':hover': {
					'bg': vars.color('700'),
					'bg-soft': vars.color('600'),
					'bg-muted': vars.color('500'),
					'bg-accent': vars.color.accent('700'),

					'border': vars.color('700'),
					'border-soft': vars.color('600'),
					'border-muted': vars.color('500'),
					'border-accent': vars.color.accent('700'),

					'fg': vars.color('50'),
				}
			}
		},
		outline: {
			'bg': vars.color('white'),
			'bg-soft': vars.color('white'),
			'bg-muted': vars.color('white'),
			'bg-accent': vars.color('white'),
			'bg-opacity': '0',

			'border': vars.color('600'),
			'border-soft': vars.color('500'),
			'border-muted': vars.color('400'),
			'border-accent': vars.color.accent('600'),
			'border-opacity': '1',

			'fg': vars.color('600'),
			'fg-soft': vars.color('500'),
			'fg-muted': vars.color('400'),
			'fg-accent': vars.color.accent('600'),
			'fg-opacity': '1',

			pseudos: {
				':hover': {
					'bg': vars.color('100'),
					'bg-soft': vars.color('100'),
					'bg-muted': vars.color('100'),
					'bg-accent': vars.color.accent('100'),
					'bg-opacity': '0.75',
				}
			},

			dark: {
				'border': vars.color('400'),
				'border-soft': vars.color('500'),
				'border-muted': vars.color('600'),
				'border-accent': vars.color.accent('400'),

				'fg': vars.color('400'),
				'fg-soft': vars.color('500'),
				'fg-muted': vars.color('600'),
				'fg-accent': vars.color.accent('400'),

				pseudos: {
					':hover': {
						'bg': vars.color('900'),
						'bg-soft': vars.color('900'),
						'bg-muted': vars.color('900'),
						'bg-accent': vars.color.accent('900'),
						'bg-opacity': '0.50',
					}
				},
			}
		},
		light: {
			'bg': vars.color('100'),
			'bg-soft': vars.color('200'),
			'bg-muted': vars.color('300'),
			'bg-accent': vars.color.accent('100'),
			'bg-opacity': '1',

			'border': vars.color('100'),
			'border-soft': vars.color('200'),
			'border-muted': vars.color('300'),
			'border-accent': vars.color.accent('100'),
			'border-opacity': '0',

			'fg': vars.color('600'),
			'fg-soft': vars.color('500'),
			'fg-muted': vars.color('400'),
			'fg-accent': vars.color.accent('600'),
			'fg-opacity': '1',

			pseudos: {
				':hover': {
					'bg': vars.color('600'),
					'bg-soft': vars.color('500'),
					'bg-muted': vars.color('400'),
					'bg-accent': vars.color.accent('600'),

					'border': vars.color('600'),
					'border-soft': vars.color('500'),
					'border-muted': vars.color('400'),
					'border-accent': vars.color.accent('600'),

					'fg': vars.color('50'),
					'fg-soft': vars.color('100'),
					'fg-muted': vars.color('200'),
					'fg-accent': vars.color.accent('50'),
				}
			},

			dark: {
				'bg': vars.color('900'),
				'bg-soft': vars.color('700'),
				'bg-muted': vars.color('600'),
				'bg-accent': vars.color.accent('900'),
				'bg-opacity': '0.5',

				'border': vars.color('900'),
				'border-soft': vars.color('700'),
				'border-muted': vars.color('600'),
				'border-accent': vars.color.accent('900'),

				'fg': vars.color('300'),
				'fg-soft': vars.color('400'),
				'fg-muted': vars.color('500'),
				'fg-accent': vars.color.accent('300'),

				pseudos: {
					':hover': {
						'bg': vars.color('600'),
						'bg-soft': vars.color('500'),
						'bg-muted': vars.color('400'),
						'bg-accent': vars.color.accent('600'),
						'bg-opacity': '1',

						'border': vars.color('600'),
						'border-soft': vars.color('500'),
						'border-muted': vars.color('400'),
						'border-accent': vars.color.accent('600'),

						'fg': vars.color('50'),
					}
				}
			}
		}
	};
}

/**
 * @param fill whether a state refers to the base value of each property it leaves out
 * @param stateName the name of a state in the keys
 */
function flatten(vars: VarsProvider, props: Omit<Partial<Variant>, 'dark' | 'colors'>, fill = true, stateName = (state: string) => state): Values {
	const { pseudos: vPseudos, ...vProps } = props;
	const cssObj = vProps as Values;

	if (vPseudos) {
		const propKeys = fill ? Object.keys(vProps) as (keyof VariantProperties)[] : [];
		for (const vpk in vPseudos) {
			const vp = vPseudos[vpk];
			if (vp) {
				const vpPropKeys = new Set([...Object.keys(vp) as (keyof VariantProperties)[], ...propKeys]);
				for (const vppk of vpPropKeys) {
					// A reference, not a copy: it resolves on the element, so a dark block or an override of the base value reaches the state
					cssObj[`${vppk}-${stateName(vpk)}`] = vp[vppk] ?? vars.variant(vppk);
				}
			}
		}
	}

	return cssObj;
}

/** `bg`, `fg` and `border` at rest, on hover and in every state the variant declares: the values calibration sets. */
function calibrated({ light, dark }: Flat) {
	const states = new Set([':hover', ...Object.keys({ ...light, ...dark }).flatMap(k => splitKey(k)[1] ?? [])]);
	return ['', ...[...states].map(s => `-${s}`)].flatMap(s => ['bg', 'fg', 'border'].map(p => `${p}${s}`));
}

function getCssVars(vars: VarsProvider, props: Omit<Partial<Variant>, 'dark' | 'colors'>) {
	return cssVars(flatten(vars, props), n => vars.v(n));
}

/** The property of a key and its state: `['bg-soft', ':hover']` of `bg-soft-:hover`, `['bg', 'open']` of `bg-open`. */
export function splitKey(key: string): [prop: string, state?: string] {
	const prop = PROP_KEY.exec(key)?.[0] ?? key;
	return key.length > prop.length ? [prop, key.slice(prop.length + 1)] : [prop];
}

/** The name of a state in `engine.resolve`: its name in variable names without the colon, `hover` of `:hover`. */
export function stateKey(state: string) {
	return state.replace(/^:+/, '');
}

/** An override value: a shade of the color, of the accent color for an `-accent` property, or the value as written. */
function shade(vars: VarsProvider, key: string, value: string) {
	// The property, not the whole key: a state may be named `low-opacity`
	if (PROP_KEY.exec(key)?.[0].endsWith('opacity') || !COLOR_SHADE_EX_REGEX.test(value))
		return value;

	return ACCENT_KEY.test(key) && /^\d/.test(value) ? vars.color.accent(value as ColorShade) : vars.color(value as ExColorShade);
}

/** Merges `source` into `target` in depth; `under` keeps the values `target` has. */
export function merge(target: Record<string, unknown>, source: object, under: boolean) {
	for (const [key, value] of Object.entries(source)) {
		if (value && typeof value === 'object') merge((target[key] ??= {}) as Record<string, unknown>, value as object, under);
		else if (!under || !(key in target)) target[key] = value;
	}
}

/** The light values of the built-in default variant, by CSS variable name. */
export function defaultVariantVars(vars: VarsProvider): VariantVars {
	const { dark: _, ...props } = defaultVariant(vars);
	const light = getCssVars(vars, props);

	// A state value that refers to its base value needs the base value as its own fallback
	for (const [name, value] of Object.entries(light)) {
		const base = /^var\((--[^,()\s]+)\)$/.exec(value)?.[1];
		if (base && base in light) {
			light[name as CSSVarName<'v'>] = `var(${base}, ${light[base as CSSVarName<'v'>]})`;
		}
	}

	return light;
}

export class VariantsGenerator extends VarsGeneratorBase<Variant, VariantCssVars> implements VariantContext {
	protected readonly items: Map<string, Variant>;
	/** Palettes given by CSS variables that also take their overrides from variables. */
	private readonly aliases = new Map<string, OverrideVars & { vars: string }>();
	/** The selectors of the `states` option, by name. */
	private readonly states = new Map<string, string>();
	/** The names of the `states` option, by selector. */
	private readonly stateNames = new Map<string, string>();
	/** The states already reported for a name that another state has. */
	private readonly clashes = new Set<string>();
	/** Whether a color is applied anywhere; the overrides of the others are left out. Set by `colors.only`. */
	hasColor = (_color: string) => true;

	/** @param states selectors of states, by name: `{ open: '[data-state=open]' }` */
	constructor(ctx: BuilderContext, private readonly scope: VariantScope = 'universal', private readonly mode: OverrideMode = 'vars', states: Record<string, string> = {}) {
		super(ctx);
		this.items = new Map([
			['default', defaultVariant(this.vars)],
			...Object.entries(mainVariants(this.vars))
		]);

		for (const [name, selector] of Object.entries(states)) {
			// A name ends variable names and is an `apply-v` token, where a level or a property would read the same; `rest` is the state without one
			if (!/^[\w-]+$/.test(name) || /^(soft|muted|accent|opacity)(-|$)/.test(name) || name === 'rest' || (APPLY_PROPS as string[]).includes(name)) {
				console.error(`WindiUI: "${name}" cannot name a state. A name is made of letters, digits, "-" and "_", and is not "rest", a property or a level such as "soft".`);
				continue;
			}

			this.states.set(name, selector);
			if (!SIMPLE_PSEUDO.test(selector)) this.stateNames.set(selector, name);
		}
	}

	/**
	 * The name of a state in variable names: a simple pseudo-class as it is, any other selector by its name in
	 * `states`, or else by its words, so that `[data-state=open]` is `data-state-open`.
	 */
	private readonly stateName = (state: string) => SIMPLE_PSEUDO.test(state)
		? state
		// shortcut: a selector whose words are a level, such as `.soft`, reads as that level; name it in `states` when one is needed.
		: this.stateNames.get(state) ?? state.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '');

	cssVars(name: string): VariantCssVars {
		const variant = this.items.get(name);
		if (!variant) {
			console.error(`Variant "${name}" not found.`);
			return {};
		}

		const { values: { light, dark }, statics, entries, keys } = this.resolved(name);

		const compound: VariantCssVars = {};
		if (this.mode !== 'vars') {
			for (const [color, own] of statics) {
				const entry = entries.get(color)!;
				for (const accent of [false, true]) {
					const block: Values = {};
					const blockDark: Values = {};
					for (const k of Object.keys({ ...own.light, ...own.dark })) {
						if (ACCENT_KEY.test(k) !== accent) continue;

						if (k in own.light) block[k] = entry.light[k];
						// The rule is more specific than the variant's dark block, so it repeats the dark value it would hide
						if (k in entry.dark) blockDark[k] = entry.dark[k];
						else if (k in own.light && k in dark) blockDark[k] = dark[k];
					}

					if (Object.keys(block).length || Object.keys(blockDark).length) {
						compound[`&.c-${accent ? 'accent-' : ''}${color}`] = {
							...cssVars(block, n => this.vars.v(n)),
							...(Object.keys(blockDark).length ? { '@dark': cssVars(blockDark, n => this.vars.v(n)) } : {}),
						};
					}
				}
			}
		}

		for (const k of keys) {
			const cv = cssEsc(this.vars.cv(`${name}-${k}`));
			light[k] = `var(${cv}, ${light[k]})`;
			if (k in dark) dark[k] = `var(${cv}, ${dark[k]})`;
		}

		const css: VariantCssVars = cssVars(light, n => this.vars.v(n));
		if (variant.dark || Object.keys(dark).length) {
			css['@dark'] = cssVars(dark, n => this.vars.v(n));
		}

		return Object.assign(css, compound);
	}

	/**
	 * Sets values of a variant for some colors, over those they have.
	 * @param under keeps the values set before, so that a preset or a calibration never replaces an explicit override
	 */
	override(name: string, colors: string | string[], override: VariantOverride | ((ctx: BuilderContext) => VariantOverride), under = false) {
		const variant = this.items.get(name);
		if (!variant) {
			console.error(`"${name}" not found.`);
			return;
		}

		const value = typeof override === 'function' ? override(this.ctx) : override;
		// A new map by single color: the factory may return a shared object, and a later comma key would win
		const byColor: Record<string, VariantOverride> = {};
		for (const [key, own] of Object.entries(variant.colors ?? {})) {
			for (const color of key.split(',')) merge(byColor[color.trim()] ??= {}, own, false);
		}
		for (const color of [colors].flat().flatMap(c => c.split(','))) {
			merge(byColor[color.trim()] ??= {}, value, under);
		}
		this.items.set(name, { ...variant, colors: byColor });
	}

	/** The colors that overrides name; with `name`, those of that variant only. */
	overrideColors(name?: string) {
		const items = name == null ? [...this.items.values()] : [this.items.get(name)].filter(v => v != null);
		return [...new Set(items.flatMap(v => Object.keys(v.colors ?? {}).flatMap(k => k.split(',').map(c => c.trim()))))];
	}

	/** Makes the palette `color` take its overrides from `{vars}-{variant}-{prop}` variables, or with no `value` stops that. */
	alias(color: string, value?: OverrideVars & { vars: string }) {
		if (value) this.aliases.set(color, value);
		else this.aliases.delete(color);
	}

	/**
	 * The override variables a `c-*` class sets: the values of `color`, and `initial` for the others, so that a color
	 * inside another one is not overridden by it. In dark mode it resets a light override where the variant has a dark
	 * value of its own. With `accent`, those of the `-accent` properties, for `c-accent-*`.
	 */
	colorVars(color: string, accent = false): ColorCssVars {
		const light: Values = {};
		const dark: Values = {};
		for (const name of this.items.keys()) {
			const { values, varEntries, keys } = this.resolved(name);
			const entry = varEntries.get(color);
			for (const k of keys) {
				if (ACCENT_KEY.test(k) !== accent) continue;

				const cv = cssEsc(this.vars.cv(`${name}-${k}`));
				light[cv] = entry?.light[k] ?? 'initial';
				if (entry && k in entry.dark) dark[cv] = entry.dark[k];
				else if (entry && k in entry.light && k in values.dark) dark[cv] = 'initial';
			}
		}

		return Object.keys(dark).length ? { ...light, '@dark': dark } : light;
	}

	private values(name: string): Flat {
		const { dark = {}, colors: _, ...props } = this.items.get(name)!;
		return { light: flatten(this.vars, props, true, this.stateName), dark: flatten(this.vars, dark, true, this.stateName) };
	}

	/**
	 * The values of variant `name` that the palette `color` takes from override variables, as pairs of the key and the
	 * variable, such as `['bg-:hover', '--ui-color-primary-solid-bg-hover']`; `undefined` when it forwards none of `name`.
	 */
	forwarded(name: string, color: string): [key: string, variable: string][] | undefined {
		const alias = this.aliases.get(color);
		if (!alias || (alias.variants && !alias.variants.includes(name))) return;

		const { vars, props = 'calibrated' } = alias;
		const values = this.values(name);
		const keys = props === 'all' ? Object.keys({ ...values.light, ...values.dark }) : props === 'calibrated' ? calibrated(values) : props;
		return keys.map(k => [k, `${vars}-${name}-${k.replace(/:/g, '')}`]);
	}

	/**
	 * The values of a variant, and its overrides by color: `statics` as configured, `entries` with what a palette given
	 * by variables forwards. `keys` get an override variable, which the colors of `varEntries` set.
	 * @param extra overrides of one color: `over` as if it were set over the ones it has, then `override` under them
	 */
	private resolved(name: string, extra?: { color: string, override?: VariantOverride, over?: VariantOverride }) {
		const values = this.values(name);
		const def = this.values('default');

		const statics = new Map<string, Flat>();
		const add = (color: string, { dark = {}, ...light }: VariantOverride, under = false) => {
			const flat = statics.get(color) ?? { light: {}, dark: {} };
			// Under, a value set before wins, and so does a light one where the variant has no dark value to give way to,
			// of its own or, for a value it leaves out, of the default variant
			const before = { light: { ...flat.light }, dark: { ...flat.dark } };
			const ownDark = (k: string) => k in values.dark || (!(k in values.light) && k in def.dark);
			const set = { light: (k: string) => k in before.light, dark: (k: string) => k in before.dark || (k in before.light && !ownDark(k)) };
			for (const [mode, props] of [['light', light], ['dark', dark]] as const) {
				for (const [k, v] of Object.entries(flatten(this.vars, props as Partial<Variant>, false, this.stateName))) {
					if (!under || !set[mode](k)) flat[mode][k] = shade(this.vars, k, v);
				}
			}
			statics.set(color, flat);
		};
		for (const [key, own] of Object.entries(this.items.get(name)!.colors ?? {})) {
			for (const color of key.split(',').map(c => c.trim()).filter(this.hasColor)) add(color, own);
		}
		if (extra?.over) add(extra.color, extra.over);
		if (extra?.override) add(extra.color, extra.override, true);

		const forwarded = new Map<string, [string, string][]>();
		for (const color of this.aliases.keys()) {
			const pairs = this.forwarded(name, color);
			if (pairs) forwarded.set(color, pairs);
		}

		const staticKeys = [...statics.values()].flatMap(f => [...Object.keys(f.light), ...Object.keys(f.dark)]);
		const forwardedKeys = [...forwarded.values()].flat().map(([k]) => k);

		// A value the variant leaves out is the default variant's, which the variant now sets itself
		for (const k of [...staticKeys, ...forwardedKeys]) {
			if (k in values.light) continue;
			values.light[k] = def.light[k] ?? this.vars.variant(PROP_KEY.exec(k)![0] as VariantProperty);
			if (k in def.dark && !(k in values.dark)) values.dark[k] = def.dark[k];
		}

		const entries = new Map(statics);
		const aliasEntries = new Map<string, Flat>();
		for (const [color, pairs] of forwarded) {
			const own = statics.get(color);
			const entry: Flat = { light: {}, dark: {} };
			for (const [k, variable] of pairs) {
				// Unset, the variable is invalid, and the static override or the variant's value applies
				const runtime = `var(${variable}`;
				entry.light[k] = `${runtime}${own?.light[k] ? `, ${own.light[k]}` : ''})`;
				if (own?.dark[k]) entry.dark[k] = `${runtime}, ${own.dark[k]})`;
				else if (k in values.dark) entry.dark[k] = `${runtime})`;
			}
			aliasEntries.set(color, entry);
			entries.set(color, { light: { ...own?.light, ...entry.light }, dark: { ...own?.dark, ...entry.dark } });
		}

		// The compound mode leaves the variables to the palettes given by variables
		if (this.mode === 'compound') {
			return { values, statics, entries, varEntries: aliasEntries, keys: new Set(forwardedKeys) };
		}

		return { values, statics, entries, varEntries: entries, keys: new Set([...staticKeys, ...forwardedKeys]) };
	}

	/** Every variable a variant can set, as `initial`: on a child it stops the parent's variant from inheriting. */
	resetVars(): VariantVars {
		const reset: VariantVars = {};
		for (const name of this.items.keys()) {
			const { '@dark': dark, ...light } = this.cssVars(name);
			for (const v of Object.keys({ ...light, ...dark })) {
				// Not the rules of the `compound` override mode
				if (v.startsWith('--')) reset[v as CSSVarName<'v'>] = 'initial';
			}
		}

		return reset;
	}

	utilCss(v: ApplyVariantMainProp, prop?: ApplyVariantSubProp, alpha?: string) {
		return this.withFallback(this.vApplyProp(v, prop, {}, undefined, alpha));
	}

	/**
	 * The CSS of `apply-v`: what `btn` gets, `bg`, `border` and `text` with `:hover`. `list` names props and states
	 * instead, such as `bg,text,focus-visible`: the props are applied at rest and in each state. Without props it is
	 * all three, without states `:hover`. A name it does not know gives `undefined`.
	 */
	applyCss(list?: string): CSS.Properties | undefined {
		const tokens = list ? list.split(',').map(t => t.trim()) : [];
		const props = tokens.filter((t): t is ApplyVariantProp => (APPLY_PROPS as string[]).includes(t));
		const states = tokens.filter(t => !(APPLY_PROPS as string[]).includes(t)).map(t => this.stateOf(t));
		if (!states.every((s): s is string => s !== undefined))
			return;

		const v = props.length ? props : true;
		return this.withFallback(this.apply(v, Object.fromEntries((states.length ? states : [':hover']).map(s => [s, v]))));
	}

	/**
	 * The selector of an `apply-v` state: a name of `states`, a state that a variant declares by its name in variable
	 * names, without the colon, or a pseudo-class of the list.
	 */
	private stateOf(token: string) {
		return this.states.get(token)
			?? this.stateSelector(token)
			?? APPLY_STATES.find(s => s === `:${token}`);
	}

	/** The selector of a declared state by its name in `engine.resolve`: `':active'` for `active`, `'[data-state=open]'` for `open`. */
	stateSelector(name: string) {
		return this.declaredStates().find(s => stateKey(this.stateName(s)) === name);
	}

	/**
	 * The states that the variants and their overrides declare in `pseudos`, such as `':hover'` or `'[data-state=open]'`.
	 * Two states of the same name in `engine.resolve`, such as `:invalid` and `[aria-invalid=true]` named `invalid`, are reported.
	 */
	declaredStates() {
		const blocks = [...this.items.values()].flatMap(v => [v, v.dark, ...Object.values(v.colors ?? {}).flatMap(o => [o, o.dark])]);
		const states = [...new Set(blocks.flatMap(b => Object.keys(b?.pseudos ?? {})))];
		const byKey = new Map<string, string>();
		for (const s of states) {
			const key = stateKey(this.stateName(s));
			const other = byKey.get(key);
			if (other && !this.clashes.has(s)) console.error(`WindiUI: the states "${other}" and "${s}" are both named "${key}"; name one of them otherwise in \`states\`.`);
			if (other) this.clashes.add(s);
			byKey.set(key, s);
		}
		return states;
	}

	/**
	 * The values of a variant on an element of `color`, its overrides applied as the `c-*` and `v-*` classes would
	 * resolve them. `dark` holds the values that change in dark mode.
	 * @param extra values for this color under its overrides, as a calibration would add them
	 * @param over values for this color over its overrides, as a theme document sets them at runtime
	 */
	colorValues(name: string, color: string, extra?: VariantOverride, over?: VariantOverride): Flat | undefined {
		if (!this.items.has(name)) {
			console.error(`Variant "${name}" not found.`);
			return;
		}

		const { values, entries } = this.resolved(name, (extra ?? over) && { color, override: extra, over });
		const entry = entries.get(color);
		// An override that reads a variable which is not set leaves the variant's value, as the `var()` of the `v-*` class does
		const or = (value: string, base: string) => {
			const read = /^var\((--[^,()\s]+)\)$/.exec(value)?.[1];
			return read && !read.startsWith(this.vars.c('')) ? `var(${read}, ${base})` : value;
		};

		// In dark mode the `c-*` class resets a light override where the variant has a dark value, so `values.dark` stays
		const light: Values = { ...values.light };
		const dark: Values = { ...values.dark };
		for (const [k, v] of Object.entries(entry?.light ?? {})) light[k] = or(v, values.light[k]);
		for (const [k, v] of Object.entries(entry?.dark ?? {})) dark[k] = or(v, values.dark[k] ?? values.light[k]);

		return { light, dark };
	}

	/**
	 * The two switches a fallback picks its light or dark value with: `var(on-light, <light>) var(on-dark, <dark>)`.
	 * The one of the current mode is not set, so its fallback is used, and the other one is empty.
	 * They inherit, so a pseudo-element is in the mode of its element, which a dark selector nested in its rule cannot tell.
	 */
	modeVars(): { light: VariantVars, dark: VariantVars } {
		// Computes to an empty value, and unlike a declaration without a value no minifier drops it
		const empty = `var(${this.vars.v('nil')},)`;

		return {
			light: { [this.vars.v('on-dark')]: empty },
			dark: { [this.vars.v('on-light')]: empty, [this.vars.v('on-dark')]: 'initial' },
		};
	}

	withFallback<T extends CSS.Properties>(css: T): T {
		if (this.scope === 'universal')
			return css;

		const { '@dark': dark = {}, ...light } = this.cssVars('default');
		const bareRead = new RegExp(`var\\((${this.vars.v('').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^,()\\s]+)\\)`, 'g');

		// `seen` stops at a default variant whose values refer to each other in a circle
		const resolve = (value: string, seen: string[] = []): string => value.replace(bareRead, (read, name: CSSVarName<'v'>) => {
			if (!(name in light) || seen.includes(name))
				return read;

			const onLight = resolve(light[name], [...seen, name]);
			const onDark = resolve(dark[name] ?? light[name], [...seen, name]);
			return onLight === onDark
				? `var(${name}, ${onLight})`
				: `var(${name}, ${this.vars.variant('on-light' as VariantProperty, onLight)} ${this.vars.variant('on-dark' as VariantProperty, onDark)})`;
		});

		const addFallback = (rule: CSS.Properties): CSS.Properties => Object.fromEntries(Object.entries(rule).map(([prop, value]) => [
			prop,
			typeof value === 'string' ? resolve(value) : typeof value === 'object' ? addFallback(value) : value
		]));

		return addFallback(css) as T;
	}

	apply(v: ApplyVariant = true, pseudos?: ApplyVariantPseudos, target: CSS.Properties = {}) {
		const appl = (pV: ApplyVariant, pTarget: CSS.Properties, pseudo?: VariantState) => {
			if (pV === false)
				return pTarget;
			if (pV === true)
				pV = ['bg', 'border', 'text'];

			const aV = pV;
			const applProp = (mProp: ApplyVariantMainProp) => {
				const vP = aV.find(p => p.startsWith(mProp));
				if (!vP) return;

				const sProp = vP.replace(new RegExp(`^${mProp}-?`), '') as ApplyVariantSubProp;
				this.vApplyProp(mProp, sProp, pTarget, pseudo);
			};

			applProp('bg');
			applProp('border');
			applProp('text');

			return pTarget;
		};

		if (v) {
			appl(v, target);
		}

		if (pseudos) {
			if (Array.isArray(pseudos)) {
				pseudos = pseudos.reduce((acc, p) => {
					acc[p] = true;
					return acc;
				}, {} as Record<VariantState, ApplyVariant>);
			}

			for (const pseudo in pseudos) {
				const pV = pseudos[pseudo];
				if (pV) {
					const pTarget = (target[`&${pseudo}`] ??= {}) as CSS.Properties;
					appl(pV, pTarget, pseudo);
				}
			}
		}

		return target;
	}

	private vApplyProp(mProp: ApplyVariantMainProp, sProp?: ApplyVariantSubProp, target: CSS.Properties = {}, pseudo?: VariantState, alpha?: string) {
		const mvp = VAR_PROP[mProp];
		const vp = (sProp && sProp !== 'default') ? `${mvp}-${sProp}` as const : mvp;
		const state = pseudo && this.stateName(pseudo);

		const aVar = state ? `${mvp}-opacity-${state}` as const : `${mvp}-opacity` as const;

		const key = state ? `${vp}-${state}` as const : vp;
		// A state that the default variant has no value for is set by the variants that have one; elsewhere it is the base value,
		// except under such a variant in the `universal` scope, whose `*` rule does not reset it
		const vVal = this.vars.variant(key, !pseudo || key in this.values('default').light ? undefined : this.vars.variant(vp));
		// Outside the `universal` scope the default variant's opacity is the fallback, which `withFallback` fills in
		const one = this.scope === 'universal' ? '1' : undefined;
		const vAlpha = this.vars.variant(aVar, pseudo ? this.vars.variant(`${mvp}-opacity`, one) : one);

		this.theme[APPLY[mProp]](vVal, target, vAlpha);

		if (alpha) {
			target[this.vars.v(aVar)] = `${alpha} !important`;

			// The element need not have a `v-*` class, so the reset of the `element` scope would not reach its children.
			if (this.scope === 'element') {
				(target as Record<string, unknown>)[':where(&) > *'] = { [this.vars.v(aVar)]: 'initial' };
			}
		}

		return target;
	}
}
