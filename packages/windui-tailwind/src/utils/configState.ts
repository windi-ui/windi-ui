import type { Config } from '@windi-ui/core';

/** Set on the plugin `windui()` returns, so that a config file may export either the config or the plugin made from it. */
export const CONFIG = Symbol.for('windui.config');

/** The config of what a config file or module exports: the options themselves, or the plugin made from them. */
export const unwrap = <F>(exported: F): Config => (exported as { [CONFIG]?: Config })[CONFIG] ?? (exported as Config);

// A config file that calls `windui()` runs in another instance of this module, so the flag has to be global.
const LOADING = Symbol.for('windui.config.loading');
const state = globalThis as { [LOADING]?: boolean };

/** True while a config file is being evaluated: a `windui()` call made by that file must not look for a config file itself. */
export const isLoadingConfig = () => state[LOADING] === true;

export function whileLoadingConfig<T>(load: () => T): T {
	state[LOADING] = true;
	try {
		return load();
	} finally {
		state[LOADING] = false;
	}
}
