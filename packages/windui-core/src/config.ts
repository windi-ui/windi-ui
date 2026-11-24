import { Builder } from "./builder";

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

export interface ResolvedConfig {
	prefix: string;
	variantScope: VariantScope;
	/** Left out, dark mode follows Tailwind's own. */
	darkSelector?: DarkSelectorOption;
	build?: (builder: Builder) => void;
}

export type Config = Partial<ResolvedConfig>;

export function resolveConfig(config: Config): ResolvedConfig {
	const {
		prefix = 'wui',
		variantScope = 'element',
		darkSelector,
		build
	} = config;

	return {
		prefix,
		variantScope,
		darkSelector,
		build
	};
}

/** Types a config object, so that one object can be shared by the plugin, a config file and other tools. */
export function defineConfig(config: Config): Config {
	return config;
}
