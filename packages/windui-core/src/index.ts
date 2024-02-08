import { resolveConfig, type Config } from './config';
import { Generator } from './Generator';
import { varsProvider } from './varsProvider';
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
