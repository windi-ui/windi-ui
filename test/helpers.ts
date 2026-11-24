import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { createJiti } from 'jiti';
import type windui from '@windi-ui/tailwind';

type Fixture = 'tw3' | 'tw4.1' | 'tw4';
type WindUI = typeof windui;
type TailwindConfig = Record<string, unknown>;
interface Loaded { path: string, base: string }

// Only what the helpers use. The real types differ per Tailwind version and the root installs none of them.
interface Tailwind4 {
	compile: (css: string, options: {
		base: string,
		loadModule: (id: string, base: string) => Promise<Loaded & { module: unknown }>,
		loadStylesheet: (id: string, base: string) => Promise<Loaded & { content: string }>,
	}) => Promise<{ build: (candidates: string[]) => string }>;
}
type PostCSS = (plugins: unknown[]) => { process(css: string, options: { from: undefined }): Promise<{ css: string }> };

export type Compile = (
	candidates: string[],
	config?: TailwindConfig,
	options?: Parameters<WindUI>[0]
) => Promise<string>;

/**
 * Moves the test file into a fixture package, which pins one Tailwind version.
 * The plugin picks its Tailwind from the working directory when it is first loaded,
 * so a test file can use one fixture only.
 */
function enter(fixture: Fixture) {
	const dir = resolve(import.meta.dirname, 'fixtures', fixture);
	process.chdir(dir);
	return { dir, require: createRequire(resolve(dir, 'package.json')) };
}

/** Tailwind v4: `compile()`, with the plugin loaded through jiti as `@tailwindcss/node` loads it. */
export function tailwind4(fixture: Exclude<Fixture, 'tw3'>): Compile {
	const { dir, require } = enter(fixture);
	const { compile } = require('tailwindcss') as Tailwind4;
	const plugin = createJiti(resolve(dir, 'package.json')).import<WindUI>('@windi-ui/tailwind', { default: true });

	// No preflight: the output should hold what WindUI emits and the theme variables it uses, nothing else.
	const css = [
		'@layer theme, base, components, utilities;',
		'@import "tailwindcss/theme.css" layer(theme);',
		'@import "tailwindcss/utilities.css" layer(utilities);',
		'@config "./tailwind.config.js";',
	].join('\n');

	return async (candidates, config = {}, options) => {
		const { build } = await compile(css, {
			base: dir,
			// The config is built in the test, so `@config` gets it whatever path it names.
			loadModule: async (id, base) => ({
				path: resolve(base, id),
				base,
				module: { ...config, plugins: [(await plugin)(options)] },
			}),
			loadStylesheet: async (id, base) => {
				const path = id.startsWith('.') ? resolve(base, id) : require.resolve(id);
				return { path, base: dirname(path), content: await readFile(path, 'utf8') };
			},
		});

		// Without Tailwind's banner, which would change the snapshot on every Tailwind patch release.
		return build(candidates).replace(/^\/\*!.*\n/, '');
	};
}

/** Tailwind v3: PostCSS with a JS config and the CommonJS build of the plugin, as a `.cjs` config loads it. */
export function tailwind3(): Compile {
	const { require } = enter('tw3');
	const postcss = require('postcss') as PostCSS;
	const tailwindcss = require('tailwindcss') as (config: TailwindConfig) => unknown;
	const plugin = require('@windi-ui/tailwind') as WindUI;

	return async (candidates, config = {}, options) => {
		const result = await postcss([tailwindcss({
			corePlugins: { preflight: false },
			...config,
			content: [{ raw: candidates.join(' ') }],
			plugins: [plugin(options)],
		})]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n', { from: undefined });

		return result.css;
	};
}
