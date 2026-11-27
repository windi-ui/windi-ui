import { expect, it, vi } from 'vitest';
import type { Compile } from './helpers';
import { dark, light } from './overrides';

type Options = NonNullable<Parameters<Compile>[2]>;

/** #51: states given by any selector, such as `[data-state=open]`, in variants, overrides, components and `apply-v`. */
export function states(compile: Compile) {
	const options: Options = {
		darkSelector: '.dark',
		states: { open: '[data-state=open]', invalid: '[aria-invalid=true]', 'low-opacity': '[data-dim]' },
		build: b => b
			.updateVariant('outline', (v, { vars }) => ({
				...v,
				pseudos: {
					...v.pseudos,
					':focus-visible': { border: vars.color('500') },
					'[data-state=open]': { bg: vars.color('100'), 'bg-opacity': '1' },
					'[aria-invalid=true]': { border: vars.color.accent('600') },
					'[data-highlighted]': { 'bg-accent': vars.color.accent('200') },
				},
				dark: { ...v.dark, pseudos: { ...v.dark?.pseudos, '[data-state=open]': { bg: vars.color('800') } } },
			}))
			.overrideVariant('outline', 'yellow', { pseudos: { '[data-state=open]': { bg: '200' }, '[data-highlighted]': { 'bg-accent': '300' }, '[data-dim]': { bg: '300' } } })
			.addComponent('trigger', () => ({ name: 'trigger', style: {}, applyVariant: true, applyVariantPseudos: [':hover', '[data-state=open]'] })),
	};

	it('names the variables of a state by its name in `states`, or else by its words, and keeps those of a pseudo-class', async () => {
		const css = await compile(['v-outline', 'c-yellow', 'c-accent-yellow'], {}, options);

		expect(light(css, '.v-outline', '--wui-v-bg-\\:hover')).toBe('var(--wui-c-100)');
		expect(light(css, '.v-outline', '--wui-v-border-\\:focus-visible')).toBe('var(--wui-c-500)');
		expect(light(css, '.v-outline', '--wui-v-bg-open')).toBe('var(--wui-cv-outline-bg-open, var(--wui-c-100))');
		expect(light(css, '.v-outline', '--wui-v-fg-open')).toBe('var(--wui-v-fg)');
		expect(light(css, '.v-outline', '--wui-v-border-invalid')).toBe('var(--wui-c-accent-600)');
		expect(dark(css, '.v-outline', '--wui-v-bg-open')).toBe('var(--wui-cv-outline-bg-open, var(--wui-c-800))');

		// An override of a state, and one of an `-accent` value, which `c-accent-*` sets
		expect(light(css, '.c-yellow', '--wui-cv-outline-bg-open')).toBe('var(--wui-c-200)');
		expect(light(css, '.c-yellow', '--wui-cv-outline-bg-low-opacity')).toBe('var(--wui-c-300)');
		expect(light(css, '.c-accent-yellow', '--wui-cv-outline-bg-accent-data-highlighted')).toBe('var(--wui-c-accent-300)');
		expect(light(css, '.c-yellow', '--wui-cv-outline-bg-accent-data-highlighted')).toBeUndefined();

		// No bracket, and no escape but the colon of a pseudo-class
		expect(css.match(/--wui-c?v-[^:;,)\s]+/g)!.filter(n => /[^\w\\-]|\\[^:]/.test(n))).toEqual([]);
	});

	it('applies a state with `applyVariantPseudos` and `apply-v`, by its name in `states`, its own name or a pseudo-class', async () => {
		const trigger = await compile(['trigger'], {}, options);
		const applied = await compile(['apply-v-[bg,open,invalid,data-highlighted,hover]'], {}, options);

		// Nested on Tailwind 4, a rule of its own on Tailwind 3
		expect(trigger).toMatch(/(&|\.trigger)\[data-state=open\] \{[^}]*var\(--wui-v-bg-open, /);
		for (const s of ['[data-state=open] {', '[aria-invalid=true] {', '[data-highlighted] {', ':hover {', 'var(--wui-v-bg-open, ', 'var(--wui-v-bg-invalid, ', 'var(--wui-v-bg-data-highlighted, ']) {
			expect(applied).toContain(s);
		}
		// A name of `states` wins over the pseudo-class of that name
		expect(applied).not.toContain(':invalid');
	});

	it('logs a name that a variable name would read as a level, or two states of one name, and leaves the name out', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(await compile(['apply-v-[soft]'], {}, { states: { soft: '[data-soft]' } })).toBe(await compile([]));
		expect(error).toHaveBeenCalledWith(expect.stringContaining('"soft" cannot name a state'));
		await compile([], {}, { states: { rest: '[data-rest]' } });
		expect(error).toHaveBeenCalledWith(expect.stringContaining('"rest" cannot name a state'));

		// A name the theme engine also gives a pseudo-class the variants declare
		await compile(['apply-v-[hover]'], {}, { states: { invalid: '[aria-invalid=true]' }, build: b => b.updateVariant('outline', v => ({ ...v, pseudos: { ...v.pseudos, ':invalid': {}, '[aria-invalid=true]': {} } })) });
		expect(error).toHaveBeenCalledWith(expect.stringContaining('the states ":invalid" and "[aria-invalid=true]" are both named "invalid"'));

		vi.restoreAllMocks();
	});
}
