import { expect, it, vi } from 'vitest';
import type { Compile } from './helpers';

/** Cases that hold on every supported Tailwind version; each fixture's test file runs them. */
export function cases(compile: Compile) {
	// #30: the callbacks stay reachable for arbitrary values, and answer the unknown ones with nothing.
	it('emits and logs nothing for unknown arbitrary values', async () => {
		const logs = (['log', 'warn', 'error'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}));

		expect(await compile(['hidden', 'c-[foo]', 'v-[foo]', 's-[foo]'])).toBe(await compile(['hidden']));
		for (const log of logs) expect(log).not.toHaveBeenCalled();

		vi.restoreAllMocks();
	});

	// #31
	it('scopes the default variant as `variantScope` says', async () => {
		const card = '.card { @apply v-solid v-scope; }';
		const universal = await compile(['bg-v'], {}, { variantScope: 'universal' });
		const element = await compile(['bg-v'], {}, {}, card);
		const inherit = await compile(['bg-v'], {}, { variantScope: 'inherit' }, card);

		// the `*` rule, and no fallback
		expect(universal).toContain('--wui-v-bg: var(--wui-c-white);');
		expect(universal).toContain('var(--wui-v-bg) ');

		for (const css of [element, inherit]) {
			expect(css).not.toContain('--wui-v-bg: var(--wui-c-white);');
			expect(css).toContain('var(--wui-v-bg, var(--wui-v-on-light, var(--wui-c-white)) var(--wui-v-on-dark, var(--wui-c-950))) ');
			// Tailwind 4 keeps the rule nested in `.card`
			expect(css).toMatch(/:where\((\.card|&)\)[\s{]+> \* \{\s+--wui-v-bg: initial;/);
		}

		expect(element).toContain(':where([class*="v-"]) > *');
		expect(inherit).not.toContain(':where([class*="v-"]) > *');
	});

	it('falls back to the built-in default variant with `vars.variant(name, { fallback: true })`', async () => {
		const css = await compile(['direct'], {}, {
			variantScope: 'universal',
			build: builder => builder.addComponent('direct', ({ vars }) => ({
				name: 'direct',
				style: { color: vars.variant('fg', { fallback: true }), outlineColor: vars.variant('bg-:hover', { fallback: true }) },
			})),
		});

		expect(css).toContain('color: var(--wui-v-fg, var(--wui-c-800));');
		expect(css).toContain('outline-color: var(--wui-v-bg-\\:hover, var(--wui-c-100));');
	});
}
