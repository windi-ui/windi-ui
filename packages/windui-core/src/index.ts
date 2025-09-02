import type { ThemeProvider } from './types';
import { resolveConfig, type Config } from './config';
import { varsProvider } from './vars';
import { ColorsGenerator } from "./colors";
import { VariantsGenerator } from "./variants";
import { SizesGenerator } from "./size";
import { ComponentsGenerator } from './components/generator';

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
		generator(theme: ThemeProvider): Generator {
			const colors = new ColorsGenerator(vars, theme);
			const variants = new VariantsGenerator(vars, theme);
			const sizes = new SizesGenerator(vars, theme);
			const components = new ComponentsGenerator({ vars, theme, colors, variants });

			return { colors, variants, sizes, components };
		}
	};
}

export type { Config };
export type * from './types';
export type { ColorShade, ExColorShade } from './colors';
export type { Variant, VariantProps, ApplyVariant, ApplyVariantMainProp, ApplyVariantSubProp, ApplyVariantProp } from './variants';
