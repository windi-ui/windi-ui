import { expect, it, vi } from 'vitest';
import windui from '@windi-ui/tailwind';
import { defineConfig } from '@windi-ui/tailwind/config';
import { safelistSource, type SafelistOptions } from '@windi-ui/tailwind/safelist';
import type { Compile, CompileCss } from './helpers';

const used = ['.c-red {', '.c-accent-indigo {', '.c-default {', '.v-solid {', '.v-default {', '.s-lg {'];

/** #37: the string itself, which needs no Tailwind. */
export function source() {
	it('lists the classes of a config, sorted', () => {
		const config = defineConfig({ build: builder => builder.removeVariant('outline').addColor('brand', 'red') });
		const expected = '{c-{accent,accent-accent,accent-blue,accent-brand,accent-default,accent-red,blue,brand,default,red},v-{default,light,solid},s-{default,lg,sm,xl,xs}}';

		expect(safelistSource(config, { palettes: ['red', 'blue'] })).toBe(expected);
		// the plugin made from the config, as a `windui.config.ts` exports it
		expect(safelistSource(windui({ ...config, config: false }), { palettes: ['red', 'blue'] })).toBe(expected);
	});

	it('lists the axes that are asked for', () => {
		expect(safelistSource({}, { axes: ['v'] })).toBe('v-{default,light,outline,solid}');
		expect(safelistSource({}, { axes: ['s', 'v'] })).toBe('{s-{default,lg,sm,xl,xs},v-{default,light,outline,solid}}');
	});
}

/** #37 on Tailwind 4, where a plugin cannot safelist and the stylesheet names the classes. */
export function safelistSourceCss(compile: Compile & { css: CompileCss }, options?: SafelistOptions) {
	it('emits the classes of `safelistSource()` through `@source inline`', async () => {
		const css = await compile.css(`@plugin "@windi-ui/tailwind";\n@source inline("${safelistSource({}, options)}");`, []);
		for (const rule of used) expect(css).toContain(rule);
	});

	it('answers `safelist: true` with the line to add, which is what `safelistSource()` returns', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const css = await compile([], {}, { safelist: true });

		expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(`\n@source inline("${safelistSource({}, options)}");`));
		expect(css).toBe(await compile([]));
		vi.restoreAllMocks();
	});
}

/** #37 on Tailwind 3. */
export function safelist(compile: Compile) {
	it('emits every `c-*`, `v-*` and `s-*` class with `safelist: true`', async () => {
		let names: string[] = [];
		const css = await compile([], { safelist: ['underline'] }, {
			safelist: true,
			build: (builder) => {
				names = [
					...builder.colorsNames().map(n => `.c-${n} {`),
					...builder.variantsNames().map(n => `.v-${n} {`),
					...builder.sizesNames().map(n => `.s-${n} {`),
				];
			},
		});

		expect(names).toEqual(expect.arrayContaining(used));
		for (const rule of names) expect(css).toContain(rule);
		// next to the safelist of the Tailwind config
		expect(css).toContain('.underline {');
		// and with Tailwind's own prefix
		expect(await compile([], { prefix: 'tw-' }, { safelist: true })).toContain('.tw-c-red {');
	});

	it('emits none of them without it', async () => {
		const css = await compile([]);
		for (const rule of used) expect(css).not.toContain(rule);
	});
}
