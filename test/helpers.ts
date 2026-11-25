import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { createJiti } from 'jiti';
import type windiui from '@windi-ui/tailwind';

type Fixture = 'tw3' | 'tw4.1' | 'tw4';
type WindiUI = typeof windiui;
type TailwindConfig = Record<string, unknown>;
interface Loaded { path: string, base: string }

// Only what the helpers use. The real types differ per Tailwind version and the root installs none of them.
interface Tailwind4 {
	compile: (css: string, options: {
		base: string,
		loadModule: (id: string, base: string, hint: 'plugin' | 'config') => Promise<Loaded & { module: unknown }>,
		loadStylesheet: (id: string, base: string) => Promise<Loaded & { content: string }>,
	}) => Promise<{ build: (candidates: string[]) => string }>;
}
type PostCSS = (plugins: unknown[]) => { process(css: string, options: { from: undefined }): Promise<{ css: string }> };

export type Compile = (
	candidates: string[],
	/** A config with `plugins` of its own keeps them, and `options` are not used. */
	config?: TailwindConfig,
	options?: Parameters<WindiUI>[0],
	/** CSS appended to the entry stylesheet, for example a rule that uses `@apply`. */
	css?: string
) => Promise<string>;

/** Compiles a stylesheet that loads WindiUI itself, with `@plugin`. The paths in it are relative to the fixture. */
export type CompileCss = (css: string, candidates: string[]) => Promise<string>;

/**
 * Loads from a fixture package, which pins one Tailwind version, while the working directory is a fixture of the
 * other major: the plugin must follow the Tailwind that runs it, not the one the working directory resolves (#32).
 */
function enter(fixture: Fixture) {
	const dir = resolve(import.meta.dirname, 'fixtures', fixture);
	process.chdir(resolve(import.meta.dirname, 'fixtures', fixture === 'tw3' ? 'tw4' : 'tw3'));
	return { dir, require: createRequire(resolve(dir, 'package.json')) };
}

/** Tailwind v4: `compile()`, with the plugin loaded through jiti as `@tailwindcss/node` loads it. */
export function tailwind4(fixture: Exclude<Fixture, 'tw3'>): Compile & { css: CompileCss } {
	const { dir, require } = enter(fixture);
	const { compile } = require('tailwindcss') as Tailwind4;
	const jiti = createJiti(resolve(dir, 'package.json'));
	const plugin = jiti.import<WindiUI>('@windi-ui/tailwind', { default: true });

	// No preflight: the output should hold what WindiUI emits and the theme variables it uses, nothing else.
	const css = [
		'@layer theme, base, components, utilities;',
		'@import "tailwindcss/theme.css" layer(theme);',
		'@import "tailwindcss/utilities.css" layer(utilities);',
	].join('\n');

	const run = async (extra: string, candidates: string[], config?: TailwindConfig) => {
		const { build } = await compile(`${css}\n${extra}`, {
			base: dir,
			// `@config` gets the config built in the test, whatever path it names; `@plugin` loads what it names.
			loadModule: async (id, base, hint) => ({
				path: resolve(base, id),
				base,
				module: hint === 'config' ? config : await jiti.import(id.startsWith('.') ? resolve(base, id) : id, { default: true }),
			}),
			loadStylesheet: async (id, base) => {
				const path = id.startsWith('.') ? resolve(base, id) : require.resolve(id);
				return { path, base: dirname(path), content: await readFile(path, 'utf8') };
			},
		});

		// Without Tailwind's banner, which would change the snapshot on every Tailwind patch release.
		return build(candidates).replace(/^\/\*!.*\n/, '');
	};

	return Object.assign<Compile, { css: CompileCss }>(
		async (candidates, config = {}, options, extra = '') => run(
			`@config "./tailwind.config.js";\n${extra}`,
			candidates,
			{ ...config, plugins: config.plugins ?? [(await plugin)(options)] }
		),
		{ css: run }
	);
}

/** Tailwind v3: PostCSS with a JS config and the CommonJS build of the plugin, as a `.cjs` config loads it. */
export function tailwind3(entry = '@windi-ui/tailwind'): Compile {
	const { require } = enter('tw3');
	const postcss = require('postcss') as PostCSS;
	const tailwindcss = require('tailwindcss') as (config: TailwindConfig) => unknown;
	const plugin = require(entry) as WindiUI;

	let run = 0;

	return async (candidates, config = {}, options, extra = '') => {
		const result = await postcss([tailwindcss({
			corePlugins: { preflight: false },
			...config,
			// Tailwind 3 caches its context by a hash of the config that sees no difference between two plugin instances.
			run: run++,
			content: [{ raw: candidates.join(' ') }],
			plugins: config.plugins ?? [plugin(options)],
		})]).process(`@tailwind base;\n@tailwind components;\n@tailwind utilities;\n${extra}`, { from: undefined });

		return result.css;
	};
}
