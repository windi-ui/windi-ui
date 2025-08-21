import { resolveConfig, type Config } from './config';
import { varsProvider } from './vars';
import { Generator } from './generator';
import type { ThemeProvider } from './types';

export function create(config: Config) {
	const rConfig = resolveConfig(config);
	const vars = varsProvider(rConfig.prefix);

	return {
		vars,
		generator(themeProvider: ThemeProvider) {
			return new Generator(vars, themeProvider);
		}
	};
}

export type { Config };
export type * from './types';
export type { ColorShade, ExColorShade } from './colors';
export type { Variant, VariantProps, ApplyVariant, ApplyVariantMainProp, ApplyVariantSubProp, ApplyVariantProp } from './variants';
