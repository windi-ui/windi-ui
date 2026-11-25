import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { defineConfig, loadWindiUIConfig } from '@windi-ui/tailwind/config';
import { tailwind4 } from './helpers';

// #33: the config file routes. Tailwind does not say where the stylesheet is, so they go by the working directory.

const compile = tailwind4('tw4');
const home = process.cwd();
const plugin = (options = '') => compile.css(`@plugin "@windi-ui/tailwind" ${options};`, ['bg-c-500']);

let dir: string;
const write = (file: string, config: object) => writeFileSync(join(dir, file), JSON.stringify(config));

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'windiui-'));
	process.chdir(dir);
});

afterEach(() => {
	process.chdir(home);
	rmSync(dir, { recursive: true });
});

it('finds `windiui.config.*` from the working directory upwards', async () => {
	writeFileSync(join(dir, 'windiui.config.ts'), 'export default { prefix: "found" } satisfies object;');
	mkdirSync(join(dir, 'app'));
	process.chdir(join(dir, 'app'));

	expect(await plugin()).toContain('--found-c-500');
});

it('finds `package.json#windiui`', async () => {
	write('package.json', { windiui: { prefix: 'pkg' } });

	expect(await plugin()).toContain('--pkg-c-500');
});

it('does not search above the workspace root', () => {
	write('windiui.config.json', { prefix: 'above' });
	mkdirSync(join(dir, 'root/app'), { recursive: true });
	writeFileSync(join(dir, 'root/pnpm-workspace.yaml'), '');

	expect(loadWindiUIConfig({ cwd: join(dir, 'root/app') })).toEqual({ config: {}, sources: [] });
});

it('loads the file the `config` option names, and no other', async () => {
	write('windiui.config.json', { prefix: 'found' });
	write('custom.json', { prefix: 'custom' });

	expect(await plugin('{ config: "./custom.json"; }')).toContain('--custom-c-500');
	await expect(plugin('{ config: "./missing.json"; }')).rejects.toThrow('config file not found');
});

it('lets inline options override the file, option by option', async () => {
	write('windiui.config.json', { prefix: 'file', variantScope: 'universal' });

	const css = await plugin('{ prefix: inline; }');
	expect(css).toContain('--inline-c-500');
	// the `*` rule of the universal scope
	expect(css).toContain('--inline-v-bg: var(--inline-c-white);');
});

it('searches for no file with `config: false`', async () => {
	write('windiui.config.json', { prefix: 'found' });

	expect(await plugin('{ config: false; }')).toContain('--wui-c-500');
});

it.each([
	['windiui.config.json', (prefix: string) => JSON.stringify({ prefix })],
	// CommonJS, which Node.js caches itself
	['windiui.config.cjs', (prefix: string) => `module.exports = { prefix: "${prefix}" };`],
])('reloads %s only when it changed', (name, content) => {
	const file = join(dir, name);
	writeFileSync(file, content('one'));
	const first = loadWindiUIConfig();
	expect(first).toEqual({ config: { prefix: 'one' }, sources: [file] });
	expect(loadWindiUIConfig()).toBe(first);

	writeFileSync(file, content('two'));
	// a second write can land on the same timestamp
	utimesSync(file, new Date(), new Date(Date.now() + 5000));
	expect(loadWindiUIConfig().config).toEqual({ prefix: 'two' });
});

it('searches from a plugin module without `build`, unless it says `config: false`', async () => {
	write('windiui.config.json', { variantScope: 'universal' });

	const entry = pathToFileURL(resolve(import.meta.dirname, '../packages/windiui-tailwind/dist/index.mjs')).href;
	const module = (name: string, options: string) => {
		writeFileSync(join(dir, name), `import windiui from "${entry}";\nexport default windiui(${options});`);
		return compile.css(`@plugin "${join(dir, name).replaceAll('\\', '/')}";`, ['bg-c-500']);
	};

	// the `*` rule of the universal scope
	expect(await module('searching.mjs', '{ prefix: "site" }')).toContain('--site-v-bg: var(--site-c-white);');

	const alone = await module('alone.mjs', '{ prefix: "site", config: false }');
	expect(alone).toContain('--site-c-500');
	expect(alone).not.toContain('--site-v-bg: var(--site-c-white);');
});

it('takes the config of a file that exports the plugin', () => {
	const { config } = loadWindiUIConfig({ config: resolve(import.meta.dirname, 'config/windiui.plugin.ts') });

	expect(config.prefix).toBe('mod');
	expect(config.build).toBeTypeOf('function');
});

it('returns the config from `defineConfig`', () => {
	const config = { prefix: 'x' };
	expect(defineConfig(config)).toBe(config);
});
