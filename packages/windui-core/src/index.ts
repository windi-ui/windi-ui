import { resolveConfig, type Config } from './config';
import { Generator } from './generator';
import { varsProvider } from './vars';
import type { ThemeProvider } from './types/';

export function create(config: Config) {
	const rConfig = resolveConfig(config);
	const cssVars = varsProvider(rConfig.prefix);

	return {
		cssVars,
		generator(themeProvider: ThemeProvider) {
			return new Generator(cssVars, themeProvider);
		}
	};
}

export { Config, ThemeProvider };
