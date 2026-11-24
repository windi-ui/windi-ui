import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { defineConfig, loadWindUIConfig } from '@windi-ui/tailwind/config';
import { tailwind4 } from './helpers';

// #33: the config file routes. Tailwind does not say where the stylesheet is, so they go by the working directory.

const compile = tailwind4('tw4');
const home = process.cwd();
const plugin = (options = '') => compile.css(`@plugin "@windi-ui/tailwind" ${options};`, ['bg-c-500']);

let dir: string;
const write = (file: string, config: object) => writeFileSync(join(dir, file), JSON.stringify(config));

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'windui-'));
	process.chdir(dir);
});

afterEach(() => {
	process.chdir(home);
	rmSync(dir, { recursive: true });
});

it('finds `windui.config.*` from the working directory upwards', async () => {
	writeFileSync(join(dir, 'windui.config.ts'), 'export default { prefix: "found" } satisfies object;');
	mkdirSync(join(dir, 'app'));
	process.chdir(join(dir, 'app'));

	expect(await plugin()).toContain('--found-c-500');
});

it('finds `package.json#windui`', async () => {
	write('package.json', { windui: { prefix: 'pkg' } });

	expect(await plugin()).toContain('--pkg-c-500');
});

it('does not search above the workspace root', () => {
	write('windui.config.json', { prefix: 'above' });
	mkdirSync(join(dir, 'root/app'), { recursive: true });
	writeFileSync(join(dir, 'root/pnpm-workspace.yaml'), '');

	expect(loadWindUIConfig({ cwd: join(dir, 'root/app') })).toEqual({ config: {}, sources: [] });
});

it('loads the file the `config` option names, and no other', async () => {
	write('windui.config.json', { prefix: 'found' });
	write('custom.json', { prefix: 'custom' });

	expect(await plugin('{ config: "./custom.json"; }')).toContain('--custom-c-500');
	await expect(plugin('{ config: "./missing.json"; }')).rejects.toThrow('config file not found');
});

it('lets inline options override the file, option by option', async () => {
	write('windui.config.json', { prefix: 'file', variantScope: 'universal' });

	const css = await plugin('{ prefix: inline; }');
	expect(css).toContain('--inline-c-500');
	// the `*` rule of the universal scope
	expect(css).toContain('--inline-v-bg: var(--inline-c-white);');
});

it('searches for no file with `config: false`', async () => {
	write('windui.config.json', { prefix: 'found' });

	expect(await plugin('{ config: false; }')).toContain('--wui-c-500');
});

it('reloads a config file only when it changed', () => {
	write('windui.config.json', { prefix: 'one' });
	const first = loadWindUIConfig();
	expect(first).toEqual({ config: { prefix: 'one' }, sources: [join(dir, 'windui.config.json')] });
	expect(loadWindUIConfig()).toBe(first);

	write('windui.config.json', { prefix: 'two' });
	// a second write can land on the same timestamp
	utimesSync(join(dir, 'windui.config.json'), new Date(), new Date(Date.now() + 5000));
	expect(loadWindUIConfig().config).toEqual({ prefix: 'two' });
});

it('takes the config of a file that exports the plugin', () => {
	const { config } = loadWindUIConfig({ config: resolve(import.meta.dirname, 'config/windui.config.ts') });

	expect(config.prefix).toBe('mod');
	expect(config.build).toBeTypeOf('function');
});

it('returns the config from `defineConfig`', () => {
	const config = { prefix: 'x' };
	expect(defineConfig(config)).toBe(config);
});
