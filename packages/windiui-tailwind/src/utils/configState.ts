import type { Config } from '@windi-ui/core';

/** Set on the plugin `windiui()` returns, so that `safelistSource()` and the config loader also take the plugin a plugin module exports. */
export const CONFIG = Symbol.for('windiui.config');

/** The config of the options themselves, or of the plugin made from them. */
export const unwrap = <F>(exported: F): Config => (exported as { [CONFIG]?: Config })[CONFIG] ?? (exported as Config);

// A config file that calls `windiui()` runs in another instance of this module, so the flag has to be global.
const LOADING = Symbol.for('windiui.config.loading');
const state = globalThis as { [LOADING]?: boolean };

/** True while a config file is being evaluated: a `windiui()` call made by that file must not look for a config file itself. */
export const isLoadingConfig = () => state[LOADING] === true;

export function whileLoadingConfig<T>(load: () => T): T {
	state[LOADING] = true;
	try {
		return load();
	} finally {
		state[LOADING] = false;
	}
}
