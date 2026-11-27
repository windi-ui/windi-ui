import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
// The built package: the root does not depend on it, and the typecheck takes no source outside its project.
import { defineConfig } from '../packages/windiui-core/dist/index.mjs';
import { createEngine, type ColorProperty } from '../packages/windiui-core/dist/theme.mjs';
import { tailwind3, tailwind4 } from '../packages/windiui-tailwind/dist/palettes.mjs';
import { bundleEngine, tailwind4 as compileTailwind4 } from './helpers';

// #45: the theme engine, `@windi-ui/core/theme`.

const dist = resolve(import.meta.dirname, '../packages/windiui-core/dist');
const palettesDist = resolve(import.meta.dirname, '../packages/windiui-tailwind/dist');

describe('the entry', () => {
	it('is in the exports, and neither it, the palettes nor their chunks import Tailwind or a Node built-in', () => {
		const exportsOf = (dir: string) => (JSON.parse(readFileSync(resolve(dir, '../package.json'), 'utf8')) as { exports: Record<string, unknown> }).exports;
		expect(exportsOf(dist)['./theme']).toEqual({ import: './dist/theme.mjs', require: './dist/theme.cjs' });
		expect(exportsOf(palettesDist)['./palettes']).toEqual({ import: './dist/palettes.mjs', require: './dist/palettes.cjs' });

		const imports = (dir: string, file: string): string[] => {
			const specifiers = [...readFileSync(resolve(dir, file), 'utf8').matchAll(/(?:from|import|require\()\s*["']([^"']+)["']/g)].map(m => m[1]);
			return specifiers.flatMap(s => s.startsWith('.') ? [s, ...imports(dir, s)] : [s]);
		};
		for (const file of ['theme.mjs', 'theme.cjs']) expect(imports(dist, file).filter(s => !s.startsWith('.'))).toEqual([]);
		for (const file of ['palettes.mjs', 'palettes.cjs']) expect(imports(palettesDist, file).filter(s => !s.startsWith('.'))).toEqual([]);
	});

	it('runs under Node without flags, as ESM and as CommonJS', () => {
		const file = (dir: string, name: string) => JSON.stringify(resolve(dir, name));
		const url = (dir: string, name: string) => JSON.stringify(pathToFileURL(resolve(dir, name)).href);
		const code = `
			const run = ({ createEngine }, { tailwind4 }) => createEngine({}, { palettes: tailwind4 }).resolve('solid', 'red');
			Promise.all([import(${url(dist, 'theme.mjs')}), import(${url(palettesDist, 'palettes.mjs')})])
				.then(esm => console.log(JSON.stringify([run(...esm), run(require(${file(dist, 'theme.cjs')}), require(${file(palettesDist, 'palettes.cjs')}))])));`;
		const [esm, cjs] = JSON.parse(execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' })) as unknown[];

		expect(esm).toEqual(createEngine({}, { palettes: tailwind4 }).resolve('solid', 'red'));
		expect(cjs).toEqual(esm);
	});

	it('bundles for a browser into one script', async () => {
		const { code, imports } = await bundleEngine();
		expect(imports).toEqual([]);
		// 40 kB minified and 14 kB gzipped in 0.9.0, as the docs say; the bound catches a dependency pulled in by mistake
		expect(gzipSync(code).length).toBeLessThan(16_000);
	});
});

describe('against the plugin', async () => {
	const config = defineConfig({
		presets: ['nuxt-ui'],
		darkSelector: '.dark',
		overrides: {
			solid: { yellow: { bg: '700', 'fg-accent': '300', pseudos: { ':hover': { bg: '800' } } } },
			light: { 'amber,lime': { fg: '700', dark: { fg: '200' } } },
		},
		build: b => b.addColor('brand', tailwind4.teal),
	});

	const engine = createEngine(config, { palettes: tailwind4 });
	const colors = [...Object.keys(tailwind4), 'default', 'accent', 'brand', 'nope'];
	const variants = ['default', 'solid', 'outline', 'light', 'soft', 'subtle', 'ghost', 'link', 'nope'];
	const css = await compileTailwind4('tw4')([...colors.map(c => `c-${c}`), ...variants.map(v => `v-${v}`)], {}, config);

	// The variables of each rule, light and in its nested dark block
	const rules: Record<string, Record<'light' | 'dark', Record<string, string>>> = {};
	const open: string[] = [];
	for (const line of css.split('\n').map(l => l.trim())) {
		if (line.endsWith('{')) open.push(line.slice(0, -2));
		else if (line === '}') open.pop();
		else {
			const [, name, value] = /^(--(?:\\.|[^:\\])+): (.+);$/.exec(line) ?? [];
			const selector = open.findLast(s => !s.startsWith('@') && !s.startsWith('&'));
			if (name && selector) ((rules[selector] ??= { light: {}, dark: {} })[open.at(-1)!.startsWith('&') ? 'dark' : 'light'])[name] = value;
		}
	}

	it('lists the variants and the colors the plugin emits classes for', () => {
		const emitted = (kind: string) => Object.keys(rules).flatMap(s => new RegExp(`^\\.${kind}-([\\w-]+)$`).exec(s)?.[1] ?? []).filter(n => !n.startsWith('accent-'));
		expect(engine.variants().sort()).toEqual(emitted('v').sort());
		expect(engine.colors().sort()).toEqual(emitted('c').sort());
	});

	it('resolves every variant and color to the shades and opacities the plugin emits, light and dark, at rest and on hover', () => {
		const PROPS = Object.keys(engine.resolve('solid', 'red').light.rest) as ColorProperty[];
		const ours: Record<string, unknown> = {};
		const plugin: Record<string, unknown> = {};

		for (const variant of engine.variants()) for (const color of engine.colors()) for (const mode of ['light', 'dark'] as const) {
			// A variable as the element reads it: the dark block over the light one, an unset or `initial` one falls back
			const lookup = (selector: string, name: string) => {
				const value = (mode === 'dark' ? rules[selector]?.dark[name] : undefined) ?? rules[selector]?.light[name];
				return value === 'initial' ? undefined : value;
			};
			const read = (value?: string): string | undefined => {
				const [, name, fallback] = /^var\(([^,()]+)(?:, (.+))?\)$/.exec(value ?? '') ?? [];
				if (!name) return value;
				if (name.startsWith('--wui-c-')) return name.slice(8);
				return read((name.startsWith('--wui-cv-') ? lookup(`.c-${color}`, name) : lookup(`.v-${variant}`, name) ?? lookup('.v-default', name)) ?? fallback);
			};

			const resolved = engine.resolve(variant, color)[mode];
			for (const state of ['rest', 'hover'] as const) for (const prop of PROPS) {
				const key = `${variant} ${color} ${mode} ${state} ${prop}`;
				const s = state === 'hover' ? '-\\:hover' : '';
				const main = prop.split('-')[0];
				ours[key] = [resolved[state][prop].shade, resolved[state][prop].opacity];
				plugin[key] = [
					read(`var(--wui-v-${prop}${s}, var(--wui-v-${prop}))`),
					Number(read(`var(--wui-v-${main}-opacity${s}, var(--wui-v-${main}-opacity, 1))`)),
				];
			}
		}

		expect(ours).toEqual(plugin);
		expect(engine.resolve('solid', 'yellow').light.rest.bg).toEqual({ shade: '700', color: tailwind4.yellow['700'], opacity: 1 });
	});

	it('throws for palettes with no `default` or `gray`', () => {
		expect(() => createEngine({}, { palettes: { brand: tailwind4.teal } })).toThrow('WindiUI: the palettes have no "default" or "gray" palette');
	});
});

describe('contrast', () => {
	const engine = createEngine();

	it.each([
		['#fff', '#000', 21],
		['#000', '#ffffff', 21],
		['#767676', '#fff', 4.54],
		['#808080', '#fff', 3.95],
		['#0000ff', '#fff', 8.59],
		['rgb(118 118 118)', 'rgb(255, 255, 255)', 4.54],
		['rgba(0, 0, 255, 0.5)', '#fff', 8.59],
		['rgb(50% 50% 50%)', '#fff', 3.98],
		['oklch(62.8% 0.2577 29.23)', '#fff', 4],
		['oklch(0.452 0.313 264.05)', '#fff', 8.59],
		['oklch(100% 0 none)', 'oklch(0% 0 0)', 21],
		['oklch(50% 0.2 180deg)', '#fff', 4.72],
	])('of %s on %s is %d', (fg, bg, ratio) => {
		expect(engine.contrast(fg, bg)).toBeCloseTo(ratio, 2);
	});

	it('takes another metric', () => {
		expect(createEngine({}, { metric: ([r], [r2]) => r - r2 }).contrast('#fff', '#000')).toBe(1);
	});

	it('rejects what is not a literal color', () => {
		expect(() => engine.contrast('var(--x)', '#fff')).toThrow('WindiUI: cannot parse the color "var(--x)".');
		expect(() => engine.contrast('oklch(50% 0.2 0.5turn)', '#fff')).toThrow('WindiUI: "0.5turn" is not a number.');
	});
});

// #39: white text on the solid shade of each palette of Tailwind, and with an override to 700
describe.each([['Tailwind 3', tailwind3], ['Tailwind 4', tailwind4]])('`v-solid` with the palettes of %s', (_, palettes) => {
	const fails = (config = {}) => {
		const engine = createEngine(config, { palettes });
		return Object.keys(palettes).filter(c => {
			const { fg, bg } = engine.resolve('solid', c).light.rest;
			return engine.contrast(fg.color, bg.color) < 4.5;
		});
	};

	it('fails 4.5:1 for white on 600 for nine palettes, and passes for all on 700', () => {
		expect(fails()).toEqual(['orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky']);
		expect(fails({ overrides: { solid: { [Object.keys(palettes).join(',')]: { bg: '700' } } } })).toEqual([]);
	});
});
