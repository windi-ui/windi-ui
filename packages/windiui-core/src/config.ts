import { Builder } from "./builder";
import type { ColorShade } from "./colors";
import type { ApplyVariantMainProp, VariantOverride, VariantProperty } from "./variants";
import type { Preset } from "./preset";
import { nuxtUi } from "./presets/nuxt-ui";

const PRESETS = { 'nuxt-ui': nuxtUi };

/** A preset of WindiUI by name, with its default options, as a config file or an `@plugin` block gives it. */
export type PresetName = keyof typeof PRESETS;

/**
 * Where the default variant comes from for an element without a `v-*` class of its own:
 * - `universal`: a `*` rule sets it on every element (the 0.7 behaviour);
 * - `element`: a `var()` fallback where a variant value is read, and children of a `v-*` element are reset to it;
 * - `inherit`: the fallback only, so a `v-*` element sets the variant for its content.
 */
export type VariantScope = 'universal' | 'element' | 'inherit';

/**
 * What dark mode follows. It takes what Tailwind's `darkMode` takes, or a bare selector such as `'.dark'`, which is
 * the `selector` strategy with that selector.
 */
export type DarkSelectorOption =
	| 'media' | 'class' | 'selector'
	| ['class' | 'selector', string]
	| ['variant', string | string[]]
	| (string & {});

/**
 * A palette of 11 shades: the name of a palette of the theme, CSS variables named `{vars}-{shade}`, or the shades
 * themselves.
 */
export type ColorValue = string | { vars: string, overrideVars?: OverrideVars } | Record<ColorShade, string>;

/**
 * Which variant values a palette given by CSS variables also takes from variables, named
 * `{vars}-{variant}-{prop}`, such as `--ui-color-primary-solid-bg-hover` for `bg-:hover`.
 */
export interface OverrideVars {
	/** Left out, every registered variant. */
	variants?: string[];
	/** `'calibrated'`, the default, is `bg`, `fg`, `border` and their `:hover` values; `'all'` is every value of the variant. */
	props?: 'calibrated' | 'all' | VariantProperty[];
}

/**
 * How a per-color override reaches the variant:
 * - `vars`: the `c-*` class sets override variables that the `v-*` class reads, wherever the two classes are;
 * - `compound`: a `.c-{color}.v-{variant}` rule, for both classes on one element;
 * - `both`.
 */
export type OverrideMode = 'vars' | 'compound' | 'both';

export interface ColorOptions {
	/**
	 * Also registers the palette as a color of the theme, for utilities such as `bg-{name}-{shade}`. This is up to the
	 * host; a palette name must then be one of the host's own palettes.
	 */
	utilities?: boolean;
}

export interface ColorsConfig {
	/** The palette behind `default`. Left out, it is a complete `default` palette of the theme, or else gray. */
	default?: ColorValue;
	/** The palette behind `accent`. Left out, it is a complete `accent` palette of the theme, or else blue. */
	accent?: ColorValue;
	/**
	 * The palettes of the theme that get a `c-*` and a `c-accent-*` class; left out, all of them. Colors of the builder
	 * always get theirs, and the root variables of `default` and `accent` stay.
	 */
	only?: string[];
}

export interface ResolvedConfig {
	prefix: string;
	/**
	 * Prefixes the class names of the components: `'wui'` makes `btn` and `badge` `wui-btn` and `wui-badge`. Left out,
	 * they have none.
	 */
	componentPrefix?: string;
	/** Where the root color and size variables are declared. More selectors let a scoped theme resolve them again. */
	rootSelector: string;
	colors: ColorsConfig;
	variantScope: VariantScope;
	/** Per-color overrides of variants: `{ solid: { yellow: { bg: '700' }, 'amber,lime': { ... } } }`. */
	overrides?: Record<string, Record<string, VariantOverride>>;
	overrideMode: OverrideMode;
	/**
	 * Color utilities from a variant: `{ bg: 'solid' }` gives `bg-{color}` the `solid` background of that color, its
	 * overrides and dark value included. Left out, there are none.
	 */
	variantUtilities?: Partial<Record<ApplyVariantMainProp, string>>;
	/** Left out, dark mode follows Tailwind's own. */
	darkSelector?: DarkSelectorOption;
	/** Run in order, before `build`. */
	presets: Preset[];
	build?: (builder: Builder) => void;
	/** Asks the host to emit every `c-*`, `v-*` and `s-*` class, also those it does not find in use. */
	safelist: boolean;
	/** Logs what is otherwise skipped silently, such as a theme palette without all 11 shades. */
	debug: boolean;
}

export type Config = Partial<Omit<ResolvedConfig, 'presets'>> & {
	presets?: (Preset | PresetName)[];
	/** @deprecated Use `colors.default`; removed in 0.9. */
	default?: ColorValue;
	/** @deprecated Use `colors.accent`; removed in 0.9. */
	accent?: ColorValue;
};

export function resolveConfig(config: Config): ResolvedConfig {
	const {
		prefix = 'wui',
		rootSelector = ':root',
		variantScope = 'element',
		overrideMode = 'vars',
		darkSelector,
		presets = [],
		build,
		safelist = false,
		debug = false
	} = config;

	// The dash is added: `wui-` would give `.wui--btn`, which nothing matches
	if (config.componentPrefix && !/^(?![cvs]$)[a-z_]([\w-]*\w)?$/i.test(String(config.componentPrefix))) {
		throw new Error(`WindiUI: \`componentPrefix\` "${config.componentPrefix}" is not a class-name prefix, or is \`c\`, \`v\` or \`s\`, which the color, variant and size classes take. Write it without the dash, such as \`wui\`.`);
	}

	return {
		prefix,
		componentPrefix: config.componentPrefix,
		rootSelector,
		// `colors.*` over the top-level options of 0.8.0
		colors: { ...config.colors, default: config.colors?.default ?? config.default, accent: config.colors?.accent ?? config.accent },
		variantScope,
		overrides: config.overrides,
		overrideMode,
		variantUtilities: config.variantUtilities,
		darkSelector,
		presets: presets.map(p => typeof p !== 'string' ? p : Object.hasOwn(PRESETS, p) ? PRESETS[p]() : unknownPreset(p)),
		build,
		safelist,
		debug
	};
}

function unknownPreset(name: string): never {
	throw new Error(`WindiUI: unknown preset "${name}". The presets are: ${Object.keys(PRESETS).join(', ')}.`);
}

/** Types a config object, so that one object can be shared by the plugin, a config file and other tools. */
export function defineConfig(config: Config): Config {
	return config;
}
