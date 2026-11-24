import { Builder } from "./builder";

/**
 * Where the default variant comes from for an element without a `v-*` class of its own:
 * - `universal`: a `*` rule sets it on every element (the 0.7 behaviour);
 * - `element`: a `var()` fallback where a variant value is read, and children of a `v-*` element are reset to it;
 * - `inherit`: the fallback only, so a `v-*` element sets the variant for its content.
 */
export type VariantScope = 'universal' | 'element' | 'inherit';

export interface ResolvedConfig {
	prefix: string;
	variantScope: VariantScope;
	build?: (builder: Builder) => void;
}

export type Config = Partial<ResolvedConfig>;

export function resolveConfig(config: Config): ResolvedConfig {
	const {
		prefix = 'wui',
		variantScope = 'element',
		build
	} = config;

	return {
		prefix,
		variantScope,
		build
	};
}
