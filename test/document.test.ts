import { describe, expect, it } from 'vitest';
// The built package: the root does not depend on it, and the typecheck takes no source outside its project.
import type { Config } from '../packages/windiui-core/dist/index.mjs';
import { createEngine, type Palette, type ThemeDocument } from '../packages/windiui-core/dist/theme.mjs';
import { tailwind4 } from '../packages/windiui-tailwind/dist/palettes.mjs';

// #48: theme documents, `parseTheme`, `toCss` and `toStatic`.

const config: Config = {
	build: b => b
		.addColor('primary', { vars: '--ui-color-primary', overrideVars: {} })
		.addColor('secondary', { vars: '--ui-color-secondary', overrideVars: { variants: ['solid'] } }),
};
const engine = createEngine(config, { palettes: tailwind4 });

// The document of the issue
const theme: ThemeDocument = {
	version: 1,
	colors: {
		primary: { seed: '#2563eb' },
		secondary: { palette: 'blue', adjust: { saturation: -20, hue: 8 } },
	},
	radius: '0.25rem',
	overrides: { solid: { primary: { bg: '700', pseudos: { ':hover': { bg: '800' } } } }, outline: { primary: { dark: { fg: '300' } } } },
};

describe('parseTheme', () => {
	it('returns a copy of a valid document', () => {
		const parsed = engine.parseTheme(JSON.parse(JSON.stringify(theme)));
		expect(parsed).toEqual(theme);
		expect(parsed.overrides).not.toBe(theme.overrides);
	});

	it.each([
		['no version', {}, 'version'],
		['another version', { version: 2 }, 'version'],
		['an unknown key', { version: 1, font: 'Inter' }, 'font'],
		['a palette spec out of bounds', { version: 1, colors: { primary: { seed: '#fff', adjust: { hue: 181 } } } }, 'colors.primary.adjust.hue'],
		['a palette spec that is no object', { version: 1, colors: { primary: null } }, 'colors.primary'],
		['an unknown palette', { version: 1, colors: { primary: { palette: 'toString' } } }, 'colors.primary.palette'],
		['a color name that is no name', { version: 1, colors: { __proto__x: { seed: '#fff' } } }, 'colors.__proto__x'],
		['a radius that is no length', { version: 1, radius: '1rem; color: red' }, 'radius'],
		['an unknown variant', { version: 1, overrides: { glass: { primary: {} } } }, 'overrides.glass'],
		['an unknown prop', { version: 1, overrides: { solid: { primary: { shadow: '700' } } } }, 'overrides.solid.primary.shadow'],
		['a value that is no shade', { version: 1, overrides: { solid: { primary: { bg: 'red' } } } }, 'overrides.solid.primary.bg'],
		['an opacity out of bounds', { version: 1, overrides: { solid: { primary: { 'bg-opacity': '2' } } } }, 'overrides.solid.primary.bg-opacity'],
		['a state without its colon', { version: 1, overrides: { solid: { primary: { pseudos: { hover: { bg: '800' } } } } } }, 'overrides.solid.primary.pseudos.hover'],
		['a dark block in a dark block', { version: 1, overrides: { solid: { primary: { dark: { dark: {} } } } } }, 'overrides.solid.primary.dark.dark'],
		['a list with an empty color', { version: 1, overrides: { solid: { 'amber,': { bg: '700' } } } }, 'overrides.solid.amber,'],
		['a color two keys set', { version: 1, overrides: { solid: { 'primary,secondary': { bg: '700' }, primary: { bg: '800' } } } }, 'overrides.solid.primary'],
	])('rejects %s, with its path', (_, json, path) => {
		expect(() => engine.parseTheme(json)).toThrow(`WindiUI: invalid theme at \`${path}\``);
	});
});

describe('toCss', () => {
	it('writes the shades and the override variables that change, with the dark block compounded', () => {
		const css = engine.toCss(theme, { darkSelector: '.dark' });
		expect(css).toMatchSnapshot();
		// Deterministic, whatever the order of the document's keys
		const { colors, overrides, ...rest } = theme;
		expect(engine.toCss({ overrides, ...rest, colors: { secondary: colors!.secondary, primary: colors!.primary } }, { darkSelector: '.dark' })).toBe(css);
	});

	it('writes only values of its own, never a string of the document', () => {
		const shades = (color: string) => Object.fromEntries(Object.keys(tailwind4.red).map(s => [s, color])) as Palette;
		expect(engine.toCss({ version: 1, colors: { primary: { shades: shades('rgb(1 2 3)') } } })).toContain('--ui-color-primary-500: #010203;');
		expect(() => engine.toCss({ version: 1, colors: { primary: { shades: shades('rgb(1 2 3; } body { color: red)') } } })).toThrow('invalid theme at `colors.primary.shades.50`');
		expect(() => engine.toCss({ version: 1, radius: '0; } body {' })).toThrow('invalid theme at `radius`');
	});

	it('takes a selector list, a media query, `reset`, `always` and RGB channels', () => {
		const one = { version: 1, colors: { primary: { seed: '#2563eb' } }, overrides: { solid: { primary: { dark: { bg: '500' } } } } } as const;

		expect(engine.toCss(one, { selector: ':root, [data-theme]', darkSelector: '.dark' }))
			.toContain(':root:where(.dark, .dark *), [data-theme]:where(.dark, .dark *) {\n  --ui-color-primary-solid-bg: var(--ui-color-primary-500);');
		expect(engine.toCss(one)).toContain('@media (prefers-color-scheme: dark) {\n  :root {\n    --ui-color-primary-solid-bg: var(--ui-color-primary-500);');

		const reset = engine.toCss(one, { reset: true });
		expect(reset).toContain('--ui-color-primary-outline-fg: initial;');
		expect(reset).toContain('--ui-color-secondary-solid-bg: initial;');
		expect(reset).not.toContain('--ui-color-secondary-outline');

		expect(engine.toCss(one, { always: ['solid.bg', 'outline.fg-:hover'] }))
			.toMatch(/--ui-color-primary-solid-bg: var\(--ui-color-primary-600\);[\s\S]*--ui-color-primary-outline-fg-hover: var\(--ui-color-primary-600\);/);
		expect(engine.toCss(one, { channels: true })).toContain('--ui-color-primary-700: 37 99 235;');
	});

	it('calibrates the document under its own overrides', () => {
		const yellow = { version: 1, colors: { primary: { palette: 'yellow' } } } as const;
		expect(engine.toCss(yellow, { calibrate: { text: 4.5 } })).toContain('--ui-color-primary-solid-bg: var(--ui-color-primary-700);');
		expect(engine.toCss({ ...yellow, overrides: { solid: { primary: { bg: '600' } } } }, { calibrate: { text: 4.5 } })).not.toContain('--ui-color-primary-solid-bg:');
	});

	it('throws for a color that the config does not give by `vars`', () => {
		expect(() => engine.toCss({ version: 1, colors: { red: { seed: '#f00' } } })).toThrow('toCss cannot write "red"');
	});
});

describe('toStatic', () => {
	const result = engine.toStatic(theme);

	it('gives hex for every color, variant, mode, state and prop, and leaves out a palette given by variables without one', () => {
		expect(Object.keys(result)).toEqual(engine.colors());
		expect(Object.keys(engine.toStatic({ version: 1 }))).toEqual(engine.colors().filter(c => c !== 'primary' && c !== 'secondary'));

		const values = Object.values(result).flatMap(byVariant => Object.values(byVariant).flatMap(({ light, dark }) => [light, dark]
			.flatMap(mode => Object.values(mode).flatMap(state => Object.values(state!)))));
		expect(values.length).toBe(Object.keys(result).length * engine.variants().length * 2 * 2 * 12);
		for (const value of values) expect(value).toMatch(/^#[\da-f]{6}$/);
	});

	it('applies the document, and paints a translucent color over the backdrop', () => {
		const primary = engine.resolvePalette(theme.colors!.primary);
		expect(result.primary.solid.light.rest.bg).toBe(primary[700]);
		expect(result.primary.solid.light.hover.bg).toBe(primary[800]);
		// The border of `solid` has opacity 0: the background shows through it, as in a browser
		expect(result.primary.solid.light.rest.border).toBe(primary[700]);
		// The background of `outline` has opacity 0
		expect(result.primary.outline.light.rest.bg).toBe('#ffffff');
		expect(engine.toStatic(theme, { backdrop: { light: '#102030' } }).primary.outline.light.rest.bg).toBe('#102030');
		expect(result.primary.outline.dark.rest.bg).toBe(engine.toStatic(theme).gray.default.dark.rest.bg);
	});
});
