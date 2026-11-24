import { Builder } from "./builder";
import type { ColorShade } from "./colors";

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
export type ColorValue = string | { vars: string } | Record<ColorShade, string>;

export interface ColorOptions {
	/**
	 * Also registers the palette as a color of the theme, for utilities such as `bg-{name}-{shade}`. This is up to the
	 * host; a palette name must then be one of the host's own palettes.
	 */
	utilities?: boolean;
}

export interface ResolvedConfig {
	prefix: string;
	/** Where the root color and size variables are declared. More selectors let a scoped theme resolve them again. */
	rootSelector: string;
	/** The palette behind `default`. Left out, it is a complete `default` palette of the theme, or else gray. */
	default?: ColorValue;
	/** The palette behind `accent`. Left out, it is a complete `accent` palette of the theme, or else blue. */
	accent?: ColorValue;
	variantScope: VariantScope;
	/** Left out, dark mode follows Tailwind's own. */
	darkSelector?: DarkSelectorOption;
	build?: (builder: Builder) => void;
	/** Asks the host to emit every `c-*`, `v-*` and `s-*` class, also those it does not find in use. */
	safelist: boolean;
	/** Logs what is otherwise skipped silently, such as a theme palette without all 11 shades. */
	debug: boolean;
}

export type Config = Partial<ResolvedConfig>;

export function resolveConfig(config: Config): ResolvedConfig {
	const {
		prefix = 'wui',
		rootSelector = ':root',
		variantScope = 'element',
		darkSelector,
		build,
		safelist = false,
		debug = false
	} = config;

	return {
		prefix,
		rootSelector,
		default: config.default,
		accent: config.accent,
		variantScope,
		darkSelector,
		build,
		safelist,
		debug
	};
}

/** Types a config object, so that one object can be shared by the plugin, a config file and other tools. */
export function defineConfig(config: Config): Config {
	return config;
}
