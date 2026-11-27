import { Builder } from "./builder";
import type { ColorShade } from "./colors";
import type { ApplyVariantMainProp, VariantOverride, VariantProperty } from "./variants";
import type { Preset } from "./preset";
import type { PaletteSpec } from "./theme/palette";
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
 * A palette of 11 shades: the name of a palette of the theme, CSS variables named `{vars}-{shade}`, the shades
 * themselves, or a palette spec, such as `{ seed: '#2563eb' }`, which gives literal shades at build time.
 */
export type ColorValue = string | { vars: string, overrideVars?: OverrideVars } | Record<ColorShade, string> | PaletteSpec;

/**
 * Which variant values a palette given by CSS variables also takes from variables, named
 * `{vars}-{variant}-{prop}`, such as `--ui-color-primary-solid-bg-hover` for `bg-:hover`.
 */
export interface OverrideVars {
	/** Left out, every registered variant. */
	variants?: string[];
	/**
	 * `'calibrated'`, the default, is `bg`, `fg`, `border` and their values on `:hover` and in every other state the
	 * variant declares, which calibration sets; `'all'` is every value of the variant.
	 */
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

/** Where the host writes the manifest, as paths relative to the working directory. A file is only written when its content changes. */
export interface ManifestFiles {
	/** The manifest as JSON: the prefix and the names of the colors, variants, sizes, components and overrides. */
	json?: string;
	/** A declaration file with the types `WindiUIColor`, `WindiUIVariant` and `WindiUISize`. */
	dts?: string;
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
	 * Names of states of variants: `{ open: '[data-state=open]' }` names the variables of that state `--wui-v-bg-open`,
	 * and `apply-v-[open]` applies it. A pseudo-class keeps its own variable names.
	 */
	states?: Record<string, string>;
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
	/** Asks the host to write the names the build registers to these files. Left out, it writes nothing. */
	manifest?: ManifestFiles;
	/** Logs what is otherwise skipped silently, such as a theme palette without all 11 shades. */
	debug: boolean;
}

export type Config = Partial<Omit<ResolvedConfig, 'presets'>> & {
	presets?: (Preset | PresetName)[];
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

	// An error, not a fallback: a config of 0.8.0 would otherwise silently get gray and blue
	const moved = (['default', 'accent'] as const).find(key => (config as Record<string, unknown>)[key] != null);
	if (moved) throw new Error(`WindiUI: the top-level \`${moved}\` option moved to \`colors.${moved}\` in 0.8.2 and was removed in 0.9.`);

	return {
		prefix,
		componentPrefix: config.componentPrefix,
		rootSelector,
		colors: { ...config.colors },
		variantScope,
		overrides: config.overrides,
		overrideMode,
		states: config.states,
		variantUtilities: config.variantUtilities,
		darkSelector,
		presets: presets.map(p => typeof p !== 'string' ? p : Object.hasOwn(PRESETS, p) ? PRESETS[p]() : unknownPreset(p)),
		build,
		safelist,
		manifest: config.manifest,
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
