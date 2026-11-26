import { expect, it } from 'vitest';
import type { Compile } from './helpers';

type Build = NonNullable<NonNullable<Parameters<Compile>[2]>['build']>;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The light value of a variable in the first rule `selector`. */
export const light = (css: string, selector: string, name: string) => new RegExp(`${esc(selector)} \\{[^{}]*?${esc(name)}: ([^;\n]+)`).exec(css)?.[1];

/** Its dark value, with `darkSelector: '.dark'`: nested on Tailwind 4, a rule of its own on Tailwind 3. */
export const dark = (css: string, selector: string, name: string) => new RegExp(
	`${esc(selector)}(?: \\{[^}]*?&)?:where\\(\\.dark, \\.dark \\*\\) \\{[^}]*?${esc(name)}: ([^;\n]+)`
).exec(css)?.[1];

/** #39: per-color overrides of a variant. */
export function overrides(compile: Compile) {
	const used = ['c-yellow', 'c-blue', 'c-accent-yellow', 'c-primary', 'c-accent-primary', 'v-solid', 'v-light', 'v-outline'];
	const run = (build: Build, options = {}) => compile(used, {}, { darkSelector: '.dark', build, ...options });

	it('reads an override variable in the variant, which the color class sets and the others reset', async () => {
		const css = await run(b => b.overrideVariant('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } }));

		expect(light(css, '.v-solid', '--wui-v-bg')).toBe('var(--wui-cv-solid-bg, var(--wui-c-600))');
		expect(light(css, '.v-solid', '--wui-v-bg-\\:hover')).toBe('var(--wui-cv-solid-bg-\\:hover, var(--wui-c-700))');
		expect(light(css, '.v-solid', '--wui-v-fg')).toBe('var(--wui-c-white)');

		expect(light(css, '.c-yellow', '--wui-cv-solid-bg')).toBe('var(--wui-c-700)');
		expect(light(css, '.c-yellow', '--wui-cv-solid-bg-\\:hover')).toBe('var(--wui-c-800)');
		for (const selector of ['.c-blue', ':root']) {
			expect(light(css, selector, '--wui-cv-solid-bg')).toBe('initial');
			expect(light(css, selector, '--wui-cv-solid-bg-\\:hover')).toBe('initial');
		}

		// Only the overridden (variant, value) pairs get a variable
		expect(css.match(/--wui-cv-[\w-]+/g)!.every(n => n.startsWith('--wui-cv-solid-bg'))).toBe(true);
	});

	it('resets an override in dark mode where the variant has a dark value, unless the override has one', async () => {
		const css = await run(b => b
			.overrideVariant('light', 'yellow', { fg: '700', bg: '200' })
			.overrideVariant('outline', 'yellow', { fg: '700', dark: { fg: '200' } }));

		expect(dark(css, '.v-light', '--wui-v-fg')).toBe('var(--wui-cv-light-fg, var(--wui-c-300))');
		expect(light(css, '.c-yellow', '--wui-cv-light-fg')).toBe('var(--wui-c-700)');
		expect(dark(css, '.c-yellow', '--wui-cv-light-fg')).toBe('initial');
		expect(dark(css, '.c-yellow', '--wui-cv-outline-fg')).toBe('var(--wui-c-200)');
		expect(dark(css, '.c-blue', '--wui-cv-light-fg')).toBeUndefined();
	});

	it('gives `-accent` values to `c-accent-*`', async () => {
		const css = await run(b => b.overrideVariant('solid', 'yellow', { 'bg-accent': '700', 'fg-accent': 'default-100' }));

		expect(light(css, '.c-accent-yellow', '--wui-cv-solid-bg-accent')).toBe('var(--wui-c-accent-700)');
		expect(light(css, '.c-accent-yellow', '--wui-cv-solid-fg-accent')).toBe('var(--wui-c-default-100)');
		expect(light(css, ':root', '--wui-cv-solid-bg-accent')).toBe('initial');
		expect(light(css, '.c-yellow', '--wui-cv-solid-bg-accent')).toBeUndefined();
	});

	it('takes shades and references at every level', async () => {
		const css = await run(b => b.overrideVariant('solid', 'yellow', ({ vars }) => ({
			bg: 'accent-600',
			fg: 'white',
			border: vars.color('900'),
			'bg-opacity': '0.5',
			pseudos: { ':hover': { bg: 'black' } },
			dark: { bg: '300', pseudos: { ':hover': { fg: 'default-200' } } },
		})));

		expect(light(css, '.c-yellow', '--wui-cv-solid-bg')).toBe('var(--wui-c-accent-600)');
		expect(light(css, '.c-yellow', '--wui-cv-solid-fg')).toBe('var(--wui-c-white)');
		expect(light(css, '.c-yellow', '--wui-cv-solid-border')).toBe('var(--wui-c-900)');
		expect(light(css, '.c-yellow', '--wui-cv-solid-bg-opacity')).toBe('0.5');
		expect(light(css, '.c-yellow', '--wui-cv-solid-bg-\\:hover')).toBe('var(--wui-c-black)');
		expect(dark(css, '.c-yellow', '--wui-cv-solid-bg')).toBe('var(--wui-c-300)');
		expect(dark(css, '.c-yellow', '--wui-cv-solid-fg-\\:hover')).toBe('var(--wui-c-default-200)');
	});

	it('gives the same CSS from the builder, the `overrides` option and `Variant.colors`', async () => {
		const css = await run(b => b.overrideVariant('solid', ['amber', 'lime'], { bg: '700' }));

		expect(light(css, '.v-solid', '--wui-v-bg')).toBe('var(--wui-cv-solid-bg, var(--wui-c-600))');
		expect(await run(() => {}, { overrides: { solid: { 'amber,lime': { bg: '700' } } } })).toBe(css);
		expect(await run(b => b.updateVariant('solid', v => {
			v.colors = { 'amber, lime': { bg: '700' } };
		}))).toBe(css);
	});

	it('reads overrides of a variant added with `colors`', async () => {
		const css = await compile(['v-ghost'], {}, {
			build: b => b.addVariant('ghost', ({ vars }) => ({
				bg: vars.color('100'), border: vars.color('600'), fg: vars.color('700'),
				colors: { yellow: { 'fg': '800', 'bg-soft': '200' } },
			})),
		});

		expect(light(css, '.v-ghost', '--wui-v-fg')).toBe('var(--wui-cv-ghost-fg, var(--wui-c-700))');
		// A value the variant leaves out falls back to the default variant's
		expect(light(css, '.v-ghost', '--wui-v-bg-soft')).toBe('var(--wui-cv-ghost-bg-soft, var(--wui-c-100))');
	});

	it('emits a compound rule with `overrideMode: \'compound\'`, and both with `\'both\'`', async () => {
		const build: Build = b => b.overrideVariant('light', 'yellow', { fg: '700' });
		const compound = await run(build, { overrideMode: 'compound' });
		const both = await run(build, { overrideMode: 'both' });
		// Tailwind 4 keeps the rule nested in `.v-light`
		const rule = /(\.v-light\.c-yellow|&\.c-yellow) \{\s+--wui-v-fg: var\(--wui-c-700\);/;
		// It repeats the variant's dark value, which its specificity would otherwise hide
		const darkRule = /(\.v-light\.c-yellow|&):where\(\.dark, \.dark \*\) \{\s+--wui-v-fg: var\(--wui-c-300\);/;

		expect(compound).toMatch(rule);
		expect(compound).toMatch(darkRule);
		expect(compound).not.toContain('--wui-cv-');

		expect(both).toMatch(rule);
		expect(light(both, '.c-yellow', '--wui-cv-light-fg')).toBe('var(--wui-c-700)');
	});

	it('forwards the override variables of a palette given by CSS variables', async () => {
		const css = await run(b => b
			.setColor('primary', { vars: '--ui-color-primary', overrideVars: { variants: ['solid', 'light'], props: ['bg', 'fg', 'bg-:hover'] } })
			.overrideVariant('solid', 'primary', { bg: '800' }));

		expect(light(css, '.c-primary', '--wui-cv-solid-bg')).toBe('var(--ui-color-primary-solid-bg, var(--wui-c-800))');
		expect(light(css, '.c-primary', '--wui-cv-solid-bg-\\:hover')).toBe('var(--ui-color-primary-solid-bg-hover)');
		expect(light(css, '.c-primary', '--wui-cv-light-fg')).toBe('var(--ui-color-primary-light-fg)');
		// Unset in dark mode, the variant's dark value applies
		expect(dark(css, '.c-primary', '--wui-cv-light-fg')).toBe('var(--ui-color-primary-light-fg)');
		expect(light(css, '.c-yellow', '--wui-cv-light-fg')).toBe('initial');
		expect(css).not.toContain('--wui-cv-outline');
		expect(css).not.toContain('--wui-cv-solid-border');
	});

	it('forwards `bg`, `fg`, `border` and their hover values of every variant by default, and all with `props: \'all\'`', async () => {
		const css = await run(b => b.setColor('primary', { vars: '--ui-color-primary', overrideVars: {} }));
		const rule = /\.c-primary \{[^{}]*/.exec(css)![0];
		expect(rule.match(/--wui-cv-/g)).toHaveLength(4 * 6);

		const all = await run(b => b.setColor('primary', { vars: '--ui-color-primary', overrideVars: { variants: ['solid'], props: 'all' } }));
		expect(light(all, '.c-primary', '--wui-cv-solid-fg-soft')).toBe('var(--ui-color-primary-solid-fg-soft)');
		expect(light(all, '.c-primary', '--wui-cv-solid-border-accent-\\:hover')).toBeUndefined();
		expect(light(all, '.c-accent-primary', '--wui-cv-solid-border-accent-\\:hover')).toBe('var(--ui-color-primary-solid-border-accent-hover)');
	});

	it('forwards them on the root for `colors.default`', async () => {
		const css = await run(() => {}, { colors: { default: { vars: '--ui-color-neutral', overrideVars: { variants: ['solid'], props: ['bg'] } } } });

		expect(light(css, ':root', '--wui-cv-solid-bg')).toBe('var(--ui-color-neutral-solid-bg)');
		expect(light(css, '.c-yellow', '--wui-cv-solid-bg')).toBe('initial');
	});

	// #47
	it('fills overrides from `calibrate` once the build is done, under the explicit ones', async () => {
		const css = await run(b => b
			.calibrate({ text: 4.5 })
			.overrideVariant('solid', 'yellow', { pseudos: { ':hover': { bg: '900' } } })
			.setColor('primary', { vars: '--ui-color-primary', overrideVars: { variants: ['solid'], props: ['bg'] } }));

		expect(light(css, '.c-yellow', '--wui-cv-solid-bg')).toBe('var(--wui-c-700)');
		expect(light(css, '.c-yellow', '--wui-cv-solid-bg-\\:hover')).toBe('var(--wui-c-900)');
		expect(light(css, '.c-yellow', '--wui-cv-light-bg-\\:hover')).toBe('var(--wui-c-700)');
		expect(dark(css, '.c-yellow', '--wui-cv-light-bg-\\:hover')).toBe('var(--wui-c-700)');
		expect(light(css, '.c-blue', '--wui-cv-solid-bg')).toBe('initial');
		// A palette given by CSS variables is left to runtime
		expect(light(css, '.c-primary', '--wui-cv-solid-bg')).toBe('var(--ui-color-primary-solid-bg)');
	});
}
