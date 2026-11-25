import { expect, it, vi } from 'vitest';
import type { Compile } from './helpers';
import { dark, light } from './overrides';

type Build = NonNullable<NonNullable<Parameters<Compile>[2]>['build']>;

/** #42: `apply-v`, and color utilities from a variant. */
export function applyV(compile: Compile) {
	// What `btn` gets from the variant, without its own style
	const bare: Build = b => b.addComponent('bare', () => ({ name: 'bare', style: {}, applyVariant: true, applyVariantPseudos: [':hover'] }));

	it.each(['universal', 'element', 'inherit'] as const)('gives `apply-v` what `btn` gets from the variant in the %s scope', async (variantScope) => {
		const options = { variantScope, build: bare };
		expect(await compile(['apply-v'], {}, options)).toBe((await compile(['bare'], {}, options)).replaceAll('.bare', '.apply-v'));
	});

	it('applies the props and states it lists', async () => {
		const sub = await compile(['apply-v-[bg-muted,text-muted]']);
		expect(sub).toContain('var(--wui-v-bg-muted, ');
		expect(sub).toContain('var(--wui-v-fg-muted-\\:hover, ');
		expect(sub).not.toContain('border-color');

		const states = await compile(['apply-v-[focus-visible,active]']);
		for (const s of [':focus-visible {', ':active {', 'var(--wui-v-border-\\:active, ']) expect(states).toContain(s);
		expect(states).not.toContain(':hover {');

		const both = await compile(['apply-v-[text,disabled]']);
		expect(both).toContain('var(--wui-v-fg-\\:disabled, ');
		expect(both).not.toContain('background-color');
		expect(both).not.toContain(':hover {');
	});

	it('emits and logs nothing for a name it does not know', async () => {
		const logs = (['log', 'warn', 'error'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}));

		expect(await compile(['hidden', 'apply-v-[bg,foo]', 'apply-v-[bg,]', 'apply-v-[hovered]', 'apply-v-foo'])).toBe(await compile(['hidden']));
		for (const log of logs) expect(log).not.toHaveBeenCalled();

		vi.restoreAllMocks();
	});

	it.each(['element', 'inherit'] as const)('carries the default variant as the fallback in the %s scope', async (variantScope) => {
		const css = await compile(['apply-v-[bg,focus-visible]'], {}, { variantScope });

		expect(css).toContain('var(--wui-v-bg, var(--wui-v-on-light, var(--wui-c-white)) var(--wui-v-on-dark, var(--wui-c-950)))');
		// A state that no variant sets is the base value
		expect(css).toContain('var(--wui-v-bg-\\:focus-visible, var(--wui-v-bg, var(--wui-v-on-light, var(--wui-c-white))');
	});

	it('works under `@apply`', async () => {
		const css = await compile([], {}, {}, '.chip { @apply apply-v-[bg,text]; }\n.tab { @apply apply-v-[hover,focus-visible]; }');

		expect(css).toMatch(/\.chip \{\s+(--tw-bg-opacity: [^;]+;\s+)?background-color: /);
		expect(css).toMatch(/(\.chip|&):hover \{/);
		expect(css).toMatch(/(\.tab|&):focus-visible \{/);
	});

	it('emits no color utilities from a variant unless `variantUtilities` asks', async () => {
		expect(await compile(['bg-yellow', 'text-blue', 'border-red'])).toBe(await compile([]));
	});

	it('gives `bg-{color}` the value of the variant for that color, its overrides and dark value included', async () => {
		const css = await compile(['c-yellow', 'c-blue', 'bg-yellow', 'bg-blue', 'border-blue', 'text-yellow', 'bg-yellow/50', 'bg-primary'], {}, {
			darkSelector: '.dark',
			variantUtilities: { bg: 'solid', text: 'light', border: 'outline' },
			build: b => b
				.overrideVariant('solid', 'yellow', { bg: '700' })
				.overrideVariant('light', 'yellow', { fg: '700' })
				.setColor('primary', { vars: '--ui-color-primary', overrideVars: { variants: ['solid'] } }),
		});
		const shade = (color: string, s: string) => light(css, `.c-${color}`, `--wui-c-${s}`)!;

		expect(light(css, '.bg-yellow', 'background-color')).toContain(shade('yellow', '700'));
		expect(light(css, '.bg-blue', 'background-color')).toContain(shade('blue', '600'));
		expect(dark(css, '.bg-blue', 'background-color')).toBeUndefined();

		expect(light(css, '.border-blue', 'border-color')).toContain(shade('blue', '600'));
		expect(dark(css, '.border-blue', 'border-color')).toContain(shade('blue', '400'));

		// The override has no dark value, so the variant's applies
		expect(light(css, '.text-yellow', 'color')).toContain(shade('yellow', '700'));
		expect(dark(css, '.text-yellow', 'color')).toContain(shade('yellow', '300'));

		expect(css).toMatch(/\.bg-yellow\\\/50 \{[^}]*(50%|--tw-bg-opacity: 0\.5)/);
		expect(light(css, '.bg-primary', 'background-color')).toContain('var(--ui-color-primary-solid-bg, var(--ui-color-primary-600))');
	});

	it('paints with the opacity of the variant', async () => {
		const css = await compile(['bg-yellow'], {}, { variantUtilities: { bg: 'outline' } });

		expect(css).toMatch(/\.bg-yellow \{[^}]*(0%|--tw-bg-opacity: 0;)/);
	});

	it('leaves Tailwind its own single-value colors and arbitrary values', async () => {
		const shades = Object.fromEntries(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map(s => [s, '#000000']));
		const config = { theme: { extend: { colors: { brand: { DEFAULT: '#123456', ...shades } } } } };
		const used = ['bg-white', 'text-black', 'bg-brand', 'bg-accent-yellow', 'bg-[#123456]', 'text-[red]', 'border-[3px]'];

		expect(await compile(used, config, { variantUtilities: { bg: 'solid', text: 'solid', border: 'solid' } })).toBe(await compile(used, config));
	});

	it('reports a variant that does not exist', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(await compile(['bg-yellow'], {}, { variantUtilities: { bg: 'glass' } })).toBe(await compile([]));
		expect(error).toHaveBeenCalledWith(expect.stringContaining('"glass"'));
		// A key that is not a main property, from a config that is not type-checked
		expect(await compile(['outline-yellow'], {}, { variantUtilities: { outline: 'solid' } as never })).toBe(await compile(['outline-yellow']));
		expect(error).toHaveBeenCalledWith(expect.stringContaining('"outline"'));

		vi.restoreAllMocks();
	});
}
