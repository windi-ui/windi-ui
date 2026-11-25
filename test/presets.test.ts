import { afterEach, describe, expect, it, vi } from 'vitest';
// The built package: the root does not depend on it, and the typecheck takes no source outside its project.
import { create, definePreset, type Config, type ThemeProvider } from '../packages/windiui-core/dist/index.mjs';
import { nuxtUi } from '../packages/windiui-core/dist/presets.mjs';
import { contrast, over, tailwind3Palettes, tailwind4Palettes, type Palettes, type Rgb } from './contrast';

// #40: `set*` on the builder, and presets.

const theme: ThemeProvider = {
	colors: () => ({}),
	spacing: () => '0',
	fontSize: () => '1rem',
	applyTextColor() {},
	applyBackgroundColor() {},
	applyBorderColor() {},
	colorValue: v => v,
};
const generator = (config: Config = {}) => create(config).generator(theme);

const BUILT_IN = ['default', 'solid', 'outline', 'light'];
const NUXT_UI = ['soft', 'subtle', 'ghost', 'link'];

afterEach(() => void vi.restoreAllMocks());

it('adds or replaces with `set*`, `default` included, without logging', () => {
	const logs = (['log', 'warn', 'error'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}));
	const { variants, sizes, components } = generator({
		build: b => b
			.setVariant('default', ({ vars }) => ({ bg: vars.color('50'), border: vars.color('200'), fg: vars.color('900') }))
			.setVariant('tint', ({ vars }) => ({ bg: vars.color('100'), border: vars.color('100'), fg: vars.color('800') }))
			.setVariant('tint', ({ vars }) => ({ bg: vars.color('200'), border: vars.color('200'), fg: vars.color('900') }))
			.setSize('default', () => ({ spacing: { '1': '1px', '1.5': '2px', '2': '3px', '3': '4px', '4': '5px' }, text: '2rem' }))
			.setSize('2xl', () => ({ spacing: { '1': '1px', '1.5': '2px', '2': '3px', '3': '4px', '4': '5px' }, text: '3rem' }))
			.setComponent('btn', () => ({ name: 'btn', style: { display: 'flex' } }))
			.setComponent('chip', () => ({ name: 'chip', style: { display: 'grid' } })),
	});

	for (const log of logs) expect(log).not.toHaveBeenCalled();
	expect(variants.names()).toEqual([...BUILT_IN, 'tint']);
	expect(variants.cssVars('default')).toEqual({ '--wui-v-bg': 'var(--wui-c-50)', '--wui-v-border': 'var(--wui-c-200)', '--wui-v-fg': 'var(--wui-c-900)' });
	expect(variants.cssVars('tint')['--wui-v-bg']).toBe('var(--wui-c-200)');
	expect(sizes.cssVars('default')['--wui-s-text']).toBe('2rem');
	expect(sizes.names()).toContain('2xl');
	const css = [...components.css()];
	expect(css.map(rule => Object.keys(rule)[0])).toEqual(['.btn', '.badge', '.chip']);
	expect(css[0]).toEqual({ '.btn': { display: 'flex' } });
	expect(css[2]).toEqual({ '.chip': { display: 'grid' } });
});

it('has only the built-in variants without a preset', () => {
	expect(generator().variants.names()).toEqual(BUILT_IN);
});

it('runs the presets in order, before `build`', () => {
	const order: string[] = [];
	const tint = definePreset('tint', b => {
		order.push('tint');
		b.updateVariant('soft', v => ({ ...v, fg: 'var(--wui-c-950)' }));
	});

	const { variants } = generator({ presets: ['nuxt-ui', tint()], build: b => void order.push(...b.variantsNames()) });

	expect(order).toEqual(['tint', ...BUILT_IN, ...NUXT_UI]);
	expect(variants.cssVars('soft')['--wui-v-fg']).toBe('var(--wui-c-950)');
});

it('keeps an item that exists with `override: false`, saying so once, and replaces it with `true`', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const mine = definePreset('mine', b => b
		.setVariant('soft', ({ vars }) => ({ bg: vars.color('300'), border: vars.color('300'), fg: vars.color('950') }))
		.setVariant('ghost', ({ vars }) => ({ bg: vars.color('300'), border: vars.color('300'), fg: vars.color('950') })));

	const kept = generator({ presets: [mine(), nuxtUi()] });
	expect(kept.variants.cssVars('soft')['--wui-v-fg']).toBe('var(--wui-c-950)');
	expect(kept.variants.cssVars('subtle')['--wui-v-fg']).toBe('var(--wui-c-800)');
	expect(warn).toHaveBeenCalledExactlyOnceWith('WindiUI: the "nuxt-ui" preset keeps "soft", "ghost", which already exist. Pass `override: true` to replace them.');

	warn.mockClear();
	const replaced = generator({ presets: [mine(), nuxtUi({ override: true })] });
	expect(replaced.variants.cssVars('soft')['--wui-v-fg']).toBe('var(--wui-c-800)');
	expect(warn).not.toHaveBeenCalled();
});

it('skips its later calls on an item it keeps, sets its own items again, and overrides its colors under their prefix', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const p = definePreset('p', b => b
		.setVariant('solid', ({ vars }) => ({ bg: vars.color('50'), border: vars.color('50'), fg: vars.color('50') }))
		.updateVariant('solid', v => ({ ...v, fg: 'var(--wui-c-50)' }))
		.setVariant('tint', ({ vars }) => ({ bg: vars.color('100'), border: vars.color('100'), fg: vars.color('800') }))
		.setVariant('tint', ({ vars }) => ({ bg: vars.color('200'), border: vars.color('200'), fg: vars.color('900') }))
		.setColor('brand', { vars: '--brand' })
		.overrideVariant('tint', 'brand', { bg: '700' }));

	const plain = generator({ presets: [p()] }).variants;
	expect(plain.cssVars('solid')).toEqual(generator().variants.cssVars('solid'));
	expect(plain.cssVars('tint')['--wui-v-bg']).toBe('var(--wui-cv-tint-bg, var(--wui-c-200))');
	expect(warn).toHaveBeenCalledExactlyOnceWith('WindiUI: the "p" preset keeps "solid", which already exists. Pass `override: true` to replace it.');

	expect(generator({ presets: [p({ prefix: 'x' })] }).variants.colorVars('x-brand')).toMatchObject({ '--wui-cv-x-tint-bg': 'var(--wui-c-700)' });
});

it('namespaces its items with `prefix` and picks them with `only`', () => {
	expect(generator({ presets: [nuxtUi({ prefix: 'nui', only: ['soft', 'link'] })] }).variants.names()).toEqual([...BUILT_IN, 'nui-soft', 'nui-link']);
});

it('reaches the items of a preset under their prefix, and the others under their own name', () => {
	const tint = definePreset('tint', b => b
		.setVariant('tint', ({ vars }) => ({ bg: vars.color('100'), border: vars.color('100'), fg: vars.color('800') }))
		.overrideVariant('tint', 'yellow', { fg: '900' })
		.updateVariant('solid', v => ({ ...v, fg: 'var(--wui-c-950)' })));

	const all = generator({ presets: [tint({ prefix: 'x' })] }).variants;
	expect(all.names()).toEqual([...BUILT_IN, 'x-tint']);
	expect(all.colorVars('yellow')['--wui-cv-x-tint-fg' as never]).toBe('var(--wui-c-900)');
	expect(all.cssVars('solid')['--wui-v-fg']).toBe('var(--wui-c-950)');

	const only = generator({ presets: [tint({ prefix: 'x', only: ['tint'] })] }).variants;
	expect(only.cssVars('solid')['--wui-v-fg']).toBe('var(--wui-c-white)');
});

it('rejects an unknown preset name, also one of `Object.prototype`', () => {
	expect(() => create({ presets: ['nope' as never] })).toThrow('WindiUI: unknown preset "nope". The presets are: nuxt-ui.');
	expect(() => create({ presets: ['toString' as never] })).toThrow('WindiUI: unknown preset "toString".');
});

const modes = ['light', 'dark'] as const;
const states = ['rest', 'hover'] as const;

/**
 * What an element with a variant and a palette paints: its background over the page, which has the default variant in
 * gray, and its text over that. The variables cascade as in the universal scope, which the other scopes paint alike.
 */
function painter(palettes: Palettes) {
	const { variants } = generator({ presets: [nuxtUi()] });
	const { '@dark': defaultDark, ...defaultLight } = variants.cssVars('default');
	const page = { light: [1, 1, 1] as Rgb, dark: palettes.gray['950'] };

	return (name: string, palette: string, mode: typeof modes[number], state: typeof states[number]) => {
		const { '@dark': dark, ...light } = variants.cssVars(name);
		const vars: Record<string, unknown> = mode === 'light' ? { ...defaultLight, ...light } : { ...defaultLight, ...defaultDark, ...light, ...dark };

		// To the shade a value comes to
		const resolve = (value: string): string => {
			const [, name, fallback] = /^var\(([^,()]+)(?:, (.+))?\)$/.exec(value) ?? [];
			if (!name) return value;
			return name.startsWith('--wui-c-') ? name.slice(8) : resolve((vars[name] ?? fallback) as string);
		};
		const color = (shade: string): Rgb => shade === 'white' ? [1, 1, 1] : shade === 'black' ? [0, 0, 0] : palettes[palette][shade];
		const s = state === 'hover' ? '-\\:hover' : '';
		const read = (prop: 'bg' | 'fg') => [
			color(resolve(`var(--wui-v-${prop}${s})`)),
			Number(resolve(`var(--wui-v-${prop}-opacity${s}, var(--wui-v-${prop}-opacity, 1))`)),
		] as const;

		const bg = over(...read('bg'), page[mode]);
		const fg = over(...read('fg'), bg);
		return { bg, fg, ratio: contrast(fg, bg) };
	};
}

describe.each([['Tailwind 3', tailwind3Palettes()], ['Tailwind 4', tailwind4Palettes()]])('the nuxt-ui preset with the palettes of %s', (_, palettes) => {
	const paint = painter(palettes);
	const each = (check: (name: string, palette: string) => void) => {
		for (const name of NUXT_UI) for (const palette of Object.keys(palettes)) check(name, palette);
	};

	it('gives every variant a dark hover state that differs from its light one', () => {
		each((name, palette) => expect(paint(name, palette, 'dark', 'hover'), `${name} ${palette}`).not.toEqual(paint(name, palette, 'light', 'hover')));
	});

	it('reaches 4.5:1 for text in every variant, state and mode', () => {
		const fails: string[] = [];
		each((name, palette) => {
			for (const mode of modes) for (const state of states) {
				const { ratio } = paint(name, palette, mode, state);
				if (ratio < 4.5) fails.push(`${name} ${palette} ${mode} ${state}: ${ratio.toFixed(2)}`);
			}
		});

		expect(fails).toEqual([]);
	});
});
