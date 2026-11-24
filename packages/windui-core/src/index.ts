import type { ThemeProvider } from './types';
import { resolveConfig, defineConfig, type ColorOptions, type ColorValue, type Config, type DarkSelectorOption, type VariantScope } from './config';
import { varsProvider } from './vars';
import { ColorsGenerator } from "./colors";
import { VariantsGenerator } from "./variants";
import { SizesGenerator } from "./size";
import { ComponentsGenerator } from './components/generator';
import { createBuilder } from './builder';

export interface Generator {
	readonly colors: ColorsGenerator;
	readonly variants: VariantsGenerator;
	readonly sizes: SizesGenerator;
	readonly components: ComponentsGenerator;
}

export function create(config: Config) {
	const rConfig = resolveConfig(config);
	const vars = varsProvider(rConfig.prefix);

	return {
		vars,
		config: rConfig,
		generator(theme: ThemeProvider): Generator {
			const ctx = { vars, theme };
			const colors = new ColorsGenerator(ctx, rConfig);
			const variants = new VariantsGenerator(ctx, rConfig.variantScope);
			const sizes = new SizesGenerator(ctx);
			const components = new ComponentsGenerator({ ...ctx, colors, variants });

			if (rConfig.build) {
				const builder = createBuilder(colors, variants, sizes, components);
				rConfig.build(builder);
			}

			return { colors, variants, sizes, components };
		}
	};
}

export { varsProvider, type VarsProvider } from './vars';
export type { Builder } from './builder';
export { defineConfig };
export type { ColorOptions, ColorValue, Config, DarkSelectorOption, VariantScope };
export type * from './types';
export type { ColorShade, ExColorShade } from './colors';
export type { Variant, VariantProperties as VariantProps, ApplyVariant, ApplyVariantMainProp, ApplyVariantSubProp, ApplyVariantProp } from './variants';
