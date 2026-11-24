import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { defineConfig, type Config } from '@windi-ui/core';

export interface LoadConfigOptions {
	/** Where the search starts, and what a relative `config` path is resolved against. Defaults to the working directory. */
	cwd?: string;
	/** Loads this file instead of searching for one. */
	config?: string;
}

export interface LoadedConfig {
	config: Config;
	/** The files the config came from; empty when none was found. */
	sources: string[];
}

/** Set on the plugin `windui()` returns, so that a config file may export either the config or the plugin made from it. */
export const CONFIG = Symbol.for('windui.config');

// A config file that calls `windui()` runs in another instance of this module, so the flag has to be global.
const LOADING = Symbol.for('windui.config.loading');
const state = globalThis as { [LOADING]?: boolean };

/** True while a config file is being evaluated: a `windui()` call made by that file must not look for a config file itself. */
export const isLoadingConfig = () => state[LOADING] === true;

const EXTENSIONS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json'];
const ROOT_MARKERS = ['pnpm-workspace.yaml', '.git', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

// `unconfig` is ESM only and only needed when a file is looked for, so it is not loaded with the plugin.
const require = createRequire(import.meta.url);

const cache = new Map<string, { result: LoadedConfig, mtimes: (number | undefined)[] }>();
const mtime = (file: string) => statSync(file, { throwIfNoEntry: false })?.mtimeMs;

function workspaceRoot(cwd: string) {
	for (let dir = cwd; ; dir = dirname(dir)) {
		if (ROOT_MARKERS.some(m => existsSync(join(dir, m)))) return dir;
		if (dirname(dir) === dir) return;
	}
}

const unwrap = <F>(exported: F) => (exported as { [CONFIG]?: Config })[CONFIG] ?? (exported as Config);

/**
 * Loads the WindUI config file: the one `config` names, or else the nearest `windui.config.{ts,mts,cts,js,mjs,cjs,json}`
 * or `package.json#windui`, from `cwd` up to the workspace root. Node only.
 */
export function loadWindUIConfig({ cwd = process.cwd(), config }: LoadConfigOptions = {}): LoadedConfig {
	const key = `${cwd}\0${config ?? ''}`;
	const cached = cache.get(key);
	// shortcut: a hit is not searched again, so a config file added nearer to `cwd` later is only seen after a restart.
	if (cached?.result.sources.every((s, i) => mtime(s) === cached.mtimes[i])) return cached.result;

	const file = config == null ? undefined : resolve(cwd, config);
	if (file && !existsSync(file)) throw new Error(`WindUI: config file not found: ${file}`);

	let loadConfigSync;
	try {
		({ loadConfigSync } = require('unconfig') as typeof import('unconfig'));
	} catch (e) {
		// A Node.js that cannot `require()` an ES module: a named file is an error, the search is left out as in 0.7.
		if (file || (e as NodeJS.ErrnoException).code !== 'ERR_REQUIRE_ESM') throw e;
		return { config: {}, sources: [] };
	}

	const root = file ? undefined : workspaceRoot(cwd);

	let loaded;
	state[LOADING] = true;
	try {
		loaded = loadConfigSync<Config>({
			cwd: file ? dirname(file) : cwd,
			// `stopAt` itself is not searched
			stopAt: root && dirname(root) !== root ? dirname(root) : undefined,
			sources: file
				? { files: file, extensions: [], rewrite: unwrap }
				: [
					{ files: 'windui.config', extensions: EXTENSIONS, rewrite: unwrap },
					{ files: 'package.json', extensions: [], rewrite: <F>(pkg: F) => (pkg as { windui?: Config }).windui },
				],
		});
	} finally {
		state[LOADING] = false;
	}

	const result = { config: loaded.config ?? {}, sources: loaded.sources };
	// Nothing found is not cached, so that a config file is picked up as soon as it exists.
	if (result.sources.length) cache.set(key, { result, mtimes: result.sources.map(mtime) });
	else cache.delete(key);

	return result;
}

export { defineConfig, type Config };
