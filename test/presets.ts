import { expect, it, vi } from 'vitest';
import { definePreset, nuxtUi } from '@windi-ui/tailwind/presets';
import type { Compile, CompileCss } from './helpers';

/** #40: presets, through the plugin. */
export function presets(compile: Compile) {
	it('emits the variants of a preset given by name or with options', async () => {
		const css = await compile(['v-soft', 'v-nui-link', 'v-nui-ghost'], {}, { presets: ['nuxt-ui', nuxtUi({ prefix: 'nui', only: ['link'] })] });

		expect(css).toMatch(/\.v-soft \{[^}]*--wui-v-fg: var\(--wui-c-800\);/);
		expect(css).toMatch(/\.v-nui-link \{[^}]*--wui-v-fg: var\(--wui-c-700\);/);
		expect(css).not.toContain('.v-nui-ghost');
	});

	it('registers the utilities of a color that a preset adds', async () => {
		const brand = definePreset('brand', b => b.setColor('brand', 'violet', { utilities: true }));
		const css = await compile(['bg-brand-500', 'bg-x-brand-500'], {}, { presets: [brand(), brand({ prefix: 'x' })] });

		expect(css).toContain('.bg-brand-500 {');
		expect(css).toContain('.bg-x-brand-500 {');
	});

	it('leaves a color of the theme, and its utilities, to Tailwind', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const red = definePreset('red', b => b.setColor('red', { vars: '--x' }, { utilities: true }));

		expect(await compile(['bg-red-500'], {}, { presets: [red()] })).toBe(await compile(['bg-red-500']));
		warn.mockRestore();
	});
}

/** #40 on Tailwind 4: `presets` in an `@plugin` block. */
export function presetsCss(compile: Compile & { css: CompileCss }) {
	it('takes `presets` by name in an `@plugin` block', async () => {
		const css = await compile.css('@plugin "@windi-ui/tailwind" { presets: nuxt-ui; }', ['v-soft', 'v-link']);

		expect(css).toContain('.v-soft {');
		expect(css).toContain('.v-link {');
	});
}
