import { expect, it } from 'vitest';
import type { Compile, CompileCss } from './helpers';

// No `dark:` utility here: with these, Tailwind's own `darkMode` and the `darkSelector` option must give the same CSS.
const candidates = ['v-outline', 'bg-v', 'btn'];

/** #34: `darkSelector` takes each form of Tailwind's `darkMode`, and a bare selector. */
export function darkSelector(compile: Compile) {
	it.each([
		['media', 'media', '@media (prefers-color-scheme: dark)'],
		['class', 'class', ':is(.dark *)'],
		[['class', '.night'], ['class', '.night'], ':is(.night *)'],
		[['selector', '.dark'], ['selector', '.dark'], ':where(.dark, .dark *)'],
		[['variant', '&:where([data-theme=dark], [data-theme=dark] *)'], ['variant', '&:where([data-theme=dark], [data-theme=dark] *)'], ':where([data-theme=dark], [data-theme=dark] *)'],
		['.night', ['selector', '.night'], ':where(.night, .night *)'],
	] as const)('follows `darkSelector: %j`', async (option, darkMode, selector) => {
		const css = await compile(candidates, {}, { darkSelector: option as string });

		expect(css).toContain(selector);
		expect(css).toBe(await compile(candidates, { darkMode }));
		// and it wins over Tailwind's own setting
		expect(await compile(candidates, { darkMode: ['selector', '.other'] }, { darkSelector: option as string })).toBe(css);
	});
}

/** #73: `&:not(.light *)` matches the `.light` element itself, and in the element scope its descendants inherit what it gets. */
export function darkOptOut(compile: Compile) {
	it.each(['element', 'universal'] as const)('leaves the `.light` element itself out of the dark rule of the base layer in the %s scope', async (variantScope) => {
		const css = await compile(['btn'], {}, {
			variantScope,
			darkSelector: ['variant', ['@media (prefers-color-scheme: dark) { &:not(.light *) }', '&:is(.dark *)']],
		});

		expect(css).toContain(':not(.light, .light *)');
		expect(css).not.toContain(':not(.light *)');
		// `&:is(.dark *)` never matches the `.dark` element, so it stays as Tailwind's `dark:` has it
		expect(css).toMatch(/:is\(\.dark \*\) \{/);
	});
}

/** Tailwind 3 drops a rule whose selector has a class that the content does not use, and `dark:` is not a use. */
export function darkClass(compile: Compile) {
	it.each(['class', ['selector', '.night']] as const)('keeps the dark default variant with `darkMode: %j` and no such class in the content', async (darkMode) => {
		expect(await compile(['bg-v', 'dark:bg-v-soft'], { darkMode })).toContain('--wui-v-on-light: ');
	});
}

/**
 * #34: without any setting, Tailwind 4 puts its own dark variant in.
 * @param expands whether this Tailwind expands `@variant dark` in the CSS of a plugin, which it does from 4.1.17.
 */
export function autoDark(compile: Compile & { css: CompileCss }, expands = true) {
	const all = [...candidates, 'dark:flex'];
	const custom = '@custom-variant dark (&:where(.dark, .dark *));';

	it.runIf(!expands)('is the media query on a Tailwind that leaves `@variant dark` as it is', async () => {
		const css = await compile.css(`${custom}\n@plugin "@windi-ui/tailwind";`, all);

		expect(css).not.toContain('@variant');
		expect(css).toBe(await compile.css(`${custom}\n@plugin "@windi-ui/tailwind" { dark-selector: media; }`, all));
	});

	it.runIf(expands)('follows the `@custom-variant dark` of the stylesheet', async () => {
		const css = await compile.css(`${custom}\n@plugin "@windi-ui/tailwind";`, all);

		expect(css).not.toContain('prefers-color-scheme');
		expect(css).not.toContain('@variant');
		// the same selector for Tailwind's `dark:flex`, a variant's dark block and the dark rule of the base layer
		expect(css).toMatch(/\.dark\\:flex[\s{&]*:where\(\.dark, \.dark \*\)/);
		expect(css).toMatch(/\.v-outline \{[^}]*&:where\(\.dark, \.dark \*\) \{\s+--wui-v-/);
		// compounded with the rule's own selector, not a descendant of it
		expect(css).toMatch(/^ {2}(\*|\* \{\s+&)?:where\(\.dark, \.dark \*\) \{\s+--wui-v-on-light/m);
	});

	it('is the media query when the stylesheet has no dark variant of its own', async () => {
		expect(await compile.css('@plugin "@windi-ui/tailwind";', all))
			.toBe(await compile.css('@plugin "@windi-ui/tailwind" { dark-selector: media; }', all));
	});

	it('takes `dark-selector` from the `@plugin` block', async () => {
		const css = await compile.css('@plugin "@windi-ui/tailwind" { dark-selector: variant, &:where(.night, .night *); }', candidates);

		expect(css).toBe(await compile(candidates, {}, { darkSelector: ['variant', '&:where(.night, .night *)'] }));
	});
}
