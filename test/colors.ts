import { afterEach, expect, it, vi } from 'vitest';
import { candidates } from './baseline';
import type { Compile, CompileCss } from './helpers';

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;
type Shade = typeof SHADES[number];
/** `#010101` for 50 up to `#0b0b0b` for 950; Tailwind 3 keeps them as channels. */
const ramp = Object.fromEntries(SHADES.map((s, i) => [s, `#${(i + 1).toString(16).padStart(2, '0').repeat(3)}`])) as Record<Shade, string>;
const inRamp = (i: number) => new RegExp(`^(${ramp[SHADES[i]]}|${i + 1} ${i + 1} ${i + 1})$`);

/** The value a variable gets in the first rule that matches `rule`. */
const value = (css: string, name: string, rule = ':root') => new RegExp(`${rule} \\{[^}]*?${name}: ([^;\n]+)`).exec(css)?.[1];

/** #35: where the `default` and `accent` palettes come from. */
export function palettes(compile: Compile) {
	const used = ['c-slate', 'c-indigo', 'c-default', 'bg-default-500', 'text-accent-600/50'];

	afterEach(() => void vi.restoreAllMocks());

	it('takes `default` and `accent` from a palette name', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const css = await compile(used, {}, { default: 'slate', accent: 'indigo' });

		for (const shade of ['50', '500', '950']) {
			const slate = value(css, `--wui-c-${shade}`, '\\.c-slate');
			expect(slate).toBeTruthy();
			expect(value(css, `--wui-c-${shade}`)).toBe(slate);
			expect(value(css, `--wui-c-default-${shade}`)).toBe(slate);
			expect(value(css, `--wui-c-${shade}`, '\\.c-default')).toBe(slate);
			expect(value(css, `--wui-c-accent-${shade}`)).toBe(value(css, `--wui-c-${shade}`, '\\.c-indigo'));
		}

		// the theme colors follow
		expect(warn).not.toHaveBeenCalled();
		expect(css).toMatch(/\.bg-default-500 \{[^}]*var\(--wui-c-default-500\)/);
		expect(css).toMatch(/\.text-accent-600\\\/50 \{[^}]*var\(--wui-c-accent-600\)/);
	});

	it('takes them from CSS variables and from the shades themselves', async () => {
		const css = await compile(used, {}, { default: { vars: '--brand' }, accent: ramp });

		expect(value(css, '--wui-c-default-500')).toBe('var(--brand-500)');
		expect(value(css, '--wui-c-500')).toBe('var(--brand-500)');
		expect(value(css, '--wui-c-accent-50')).toMatch(inRamp(0));
		expect(value(css, '--wui-c-accent-950')).toMatch(inRamp(10));
	});

	it('rejects an option that gives no palette', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(compile(used, {}, { default: 'nope' })).rejects.toThrow('`default` option');
		await expect(compile(used, {}, { accent: { 500: '#000' } as never })).rejects.toThrow('`accent` option');
	});

	it('takes a complete palette of the theme, after the option', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const config = { theme: { extend: { colors: { default: ramp } } } };

		const themed = await compile(used, config);
		expect(value(themed, '--wui-c-default-500')).toMatch(inRamp(5));
		expect(value(themed, '--wui-c-500')).toMatch(inRamp(5));
		expect(themed).toMatch(/\.bg-default-500 \{[^}]*(#060606|6 6 6)/);
		expect(warn).not.toHaveBeenCalled();

		// The option sets the variables. Tailwind keeps the theme's own palette over a plugin's, so the utilities stay with it.
		const option = await compile(used, config, { default: 'slate' });
		expect(value(option, '--wui-c-default-500')).toBe(value(option, '--wui-c-500', '\\.c-slate'));
		expect(option).toMatch(/\.bg-default-500 \{[^}]*(#060606|6 6 6)/);
		expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('the theme has a "default" palette of its own'));
	});

	it('does not take a complete palette for a partial one when it shares shades with the fallback', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		// gray-400 as this Tailwind has it: Tailwind 4 declares the variable, Tailwind 3 has the hex value
		const gray = /--color-gray-400: ([^;]+);/.exec(await compile(['bg-gray-400']))?.[1] ?? '#9ca3af';

		const css = await compile(used, { theme: { extend: { colors: { default: { ...ramp, 400: gray } } } } });
		expect(value(css, '--wui-c-default-500')).toMatch(inRamp(5));
		expect(warn).not.toHaveBeenCalled();
	});

	it('warns about a theme palette that sets some of the shades', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const css = await compile(used, { theme: { extend: { colors: { accent: { 500: ramp[500], 600: ramp[600] } } } } });

		expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('"accent" palette has no shade 50, 100, 200, 300, 400, 700, 800, 900, 950; these are taken from blue'));
		// as in 0.7: the shades the theme has, over blue
		expect(value(css, '--wui-c-accent-500')).toMatch(inRamp(5));
		expect(value(css, '--wui-c-accent-400')).toBe(value(await compile(used), '--wui-c-accent-400'));
	});

	it('reports a palette without all 11 shades only with `debug`', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const config = { theme: { extend: { colors: { brand: { 500: '#f00', 600: '#e00' } } } } };

		await compile(used, config);
		expect(warn).not.toHaveBeenCalled();

		await compile(used, config, { debug: true });
		expect(warn).toHaveBeenCalledExactlyOnceWith('Color palette "brand" does not have all 11 shades (50, 100, ..., 950).');
	});
}

/** #35, in a Tailwind 4 stylesheet. */
export function palettesCss(compile: Compile & { css: CompileCss }) {
	const theme = (shades: readonly Shade[]) => `@theme { ${shades.map(s => `--color-default-${s}: ${ramp[s]};`).join(' ')} }`;

	it('takes the palette names from the `@plugin` block', async () => {
		expect(await compile.css('@plugin "@windi-ui/tailwind" { default: slate; accent: indigo; }', candidates))
			.toBe(await compile(candidates, {}, { default: 'slate', accent: 'indigo' }));
	});

	it('takes a complete `@theme` palette, and warns about one that is not', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const complete = await compile.css(`${theme(SHADES)}\n@plugin "@windi-ui/tailwind";`, ['bg-default-500']);
		expect(value(complete, '--wui-c-default-50')).toBe(ramp[50]);
		expect(value(complete, '--wui-c-default-950')).toBe(ramp[950]);
		expect(warn).not.toHaveBeenCalled();

		// complete, with a shade that is the same as gray's
		await compile.css(`${theme(SHADES)}\n@theme { --color-default-400: var(--color-gray-400); }\n@plugin "@windi-ui/tailwind";`, ['bg-default-500']);
		expect(warn).not.toHaveBeenCalled();

		await compile.css(`${theme(['500'])}\n@plugin "@windi-ui/tailwind";`, ['bg-default-500']);
		expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('"default" palette has no shade 50, 100, 200, 300, 400, 600, 700, 800, 900, 950; these are taken from gray'));
	});
}

/** #36: palettes added with the builder. */
export function builderColors(compile: Compile) {
	it('adds a color from CSS variables, from shades and from a palette name', async () => {
		const css = await compile(['c-primary', 'c-accent-primary', 'c-brand', 'c-accent-brand', 'c-danger', 'c-accent-danger', 'c-red'], {}, {
			build: builder => builder
				.addColor('primary', { vars: '--ui-color-primary' })
				.addColor('brand', ramp)
				.addColor('danger', 'red'),
		});

		expect(value(css, '--wui-c-500', '\\.c-primary')).toBe('var(--ui-color-primary-500)');
		expect(value(css, '--wui-c-accent-950', '\\.c-accent-primary')).toBe('var(--ui-color-primary-950)');
		expect(value(css, '--wui-c-50', '\\.c-brand')).toMatch(inRamp(0));
		expect(value(css, '--wui-c-accent-950', '\\.c-accent-brand')).toMatch(inRamp(10));
		expect(value(css, '--wui-c-500', '\\.c-danger')).toBe(value(css, '--wui-c-500', '\\.c-red'));
		expect(value(css, '--wui-c-accent-500', '\\.c-accent-danger')).toBe(value(css, '--wui-c-500', '\\.c-red'));
	});

	it('skips `addColor` on a name that exists, and replaces with `setColor`', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const css = await compile(['c-red', 'c-blue', 'c-green', 'c-pink', 'c-default'], {}, {
			build: builder => builder
				.addColor('red', ramp)
				.setColor('blue', ramp)
				.setColor('default', 'slate')
				.updateColor('green', palette => void palette.set('500', 'var(--green)'))
				.removeColor('pink'),
		});

		expect(error).toHaveBeenCalledExactlyOnceWith('"red" already exists.');
		expect(value(css, '--wui-c-500', '\\.c-red')).not.toMatch(inRamp(5));
		expect(value(css, '--wui-c-500', '\\.c-blue')).toMatch(inRamp(5));
		expect(value(css, '--wui-c-500', '\\.c-green')).toBe('var(--green)');
		expect(value(css, '--wui-c-400', '\\.c-green')).not.toBe('var(--green)');
		expect(css).not.toContain('.c-pink');
		expect(value(css, '--wui-c-default-500')).not.toBe(value(await compile(['c-default']), '--wui-c-default-500'));
	});

	it('leaves a color of the theme alone when `addColor` names it with `utilities`', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const css = await compile(['c-red', 'bg-red-500'], {}, {
			build: builder => builder.addColor('red', { vars: '--x' }, { utilities: true }),
		});

		expect(error).toHaveBeenCalledExactlyOnceWith('"red" already exists.');
		expect(css).toBe(await compile(['c-red', 'bg-red-500']));
	});

	it('registers a color with the theme when `utilities` is set', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const css = await compile(['c-primary', 'bg-primary-500', 'text-primary-500/50', 'bg-brand-500', 'bg-danger-500', 'bg-red-500', 'bg-plain-500'], {}, {
			build: builder => builder
				.addColor('primary', { vars: '--ui-color-primary' }, { utilities: true })
				.addColor('brand', ramp, { utilities: true })
				.addColor('danger', 'red', { utilities: true })
				.addColor('plain', ramp),
		});

		expect(error).not.toHaveBeenCalled();
		expect(css).toMatch(/\.bg-primary-500 \{[^}]*var\(--ui-color-primary-500\)/);
		// the modifier: `color-mix()` on Tailwind 4, the alpha of `rgb()` on Tailwind 3
		expect(css).toMatch(/\.text-primary-500\\\/50 \{[^}]*(var\(--ui-color-primary-500\) 50%|rgb\(var\(--ui-color-primary-500\) \/ 0\.5\))/);
		expect(css).toMatch(/\.bg-brand-500 \{[^}]*(#060606|6 6 6)/);
		// Tailwind's own red, as a value: on Tailwind 4 `bg-red-500` itself is a reference to the theme variable
		expect(css).toMatch(/\.bg-danger-500 \{[^}]*background-color: (oklch|rgb)\(/);
		expect(css).not.toContain('.bg-plain-500');
		// and the class of the builder is still its own
		expect(value(css, '--wui-c-500', '\\.c-primary')).toBe('var(--ui-color-primary-500)');
	});

	it('declares the root variables on `rootSelector`', async () => {
		const css = await compile(['c-red'], {}, { rootSelector: ':root, [data-theme-scope]' });
		const root = ':root, \\[data-theme-scope\\]';

		expect(value(css, '--wui-c-500', root)).toBe(value(await compile(['c-red']), '--wui-c-500'));
		expect(value(css, '--wui-c-accent-500', root)).toBeTruthy();
		expect(value(css, '--wui-s-text', root)).toBeTruthy();
		expect(css).not.toMatch(/:root \{[^}]*--wui-[cs]-/);
	});
}

/** #36, in a Tailwind 4 stylesheet. */
export function rootSelectorCss(compile: Compile & { css: CompileCss }) {
	it.each(['":root, [data-theme-scope]"', ':root, [data-theme-scope]'])('takes `root-selector: %s` from the `@plugin` block', async (selector) => {
		expect(await compile.css(`@plugin "@windi-ui/tailwind" { root-selector: ${selector}; }`, candidates))
			.toBe(await compile(candidates, {}, { rootSelector: ':root, [data-theme-scope]' }));
	});
}
