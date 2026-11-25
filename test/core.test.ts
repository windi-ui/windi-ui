import { describe, expect, it, vi } from 'vitest';
// The built package: the root does not depend on it, and the typecheck takes no source outside its project.
import { create, type Config, type Size, type ThemeProvider } from '../packages/windiui-core/dist/index.mjs';

const theme = { colors: () => ({}), spacing: () => '0', fontSize: () => '1rem', colorValue: (v: string) => v } as unknown as ThemeProvider;

// #39: a preset or a calibration merges its overrides under the explicit ones, before or after them.
it('keeps an explicit override over one merged under it', () => {
	const { variants } = create({}).generator(theme);
	const preset = { bg: '600', fg: '50', pseudos: { ':hover': { bg: '900', fg: '100' } } } as const;

	variants.override('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } });
	variants.override('solid', 'yellow', preset, true);
	variants.override('light', 'yellow', preset, true);
	variants.override('light', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } });

	expect(variants.colorVars('yellow')).toMatchObject(Object.fromEntries(['solid', 'light'].flatMap(v => [
		[`--wui-cv-${v}-bg`, 'var(--wui-c-700)'],
		[`--wui-cv-${v}-fg`, 'var(--wui-c-50)'],
		[`--wui-cv-${v}-bg-\\:hover`, 'var(--wui-c-800)'],
		[`--wui-cv-${v}-fg-\\:hover`, 'var(--wui-c-100)'],
	])));
});

// #39: per-color overrides
const overrideShades = ['100', '200', '400', '700', '800', '900'];
const palettes = Object.fromEntries(['yellow', 'amber', 'red'].flatMap(p => overrideShades.map(s => [`${p}-${s}`, `${p}${s}`])));
const gen = (config: Parameters<typeof create>[0] = {}) => create(config).generator({ ...theme, colors: () => palettes });
const ghost = { bg: 'var(--wui-c-100)', border: 'var(--wui-c-600)', fg: 'var(--wui-c-700)' } as const;

it('takes the dark value of the variant, or else of the default variant, for a key that only an override sets', () => {
	const { variants } = gen({
		build: b => b.addVariant('ghost', () => ghost).addVariant('x', () => ({ ...ghost, dark: { 'bg-soft': 'var(--wui-c-800)' } })),
		overrides: { ghost: { yellow: { 'bg-soft': '200' } }, x: { yellow: { 'bg-soft': '200' } } },
	});

	expect(variants.cssVars('ghost')['@dark']).toEqual({ '--wui-v-bg-soft': 'var(--wui-cv-ghost-bg-soft, var(--wui-c-900))' });
	expect(variants.cssVars('x')['@dark']).toEqual({ '--wui-v-bg-soft': 'var(--wui-cv-x-bg-soft, var(--wui-c-800))' });
});

it('wins over a comma key of the variant, and leaves the object of the variant as it was', () => {
	const shared = { ...ghost, colors: { amber: { fg: '900' }, 'amber,red': { bg: '700' } } } as const;
	const before = JSON.stringify(shared);
	const { variants } = gen({ build: b => b.addVariant('x', () => shared), overrides: { x: { amber: { bg: '800' } } } });

	expect(variants.colorVars('amber')).toMatchObject({ '--wui-cv-x-bg': 'var(--wui-c-800)', '--wui-cv-x-fg': 'var(--wui-c-900)' });
	expect(JSON.stringify(shared)).toBe(before);
});

it('sets only the states an override names, and forwards its dark value as the fallback of a palette given by variables', () => {
	const { variants } = gen({
		build: b => b.setColor('primary', { vars: '--p', overrideVars: { variants: ['light'], props: ['fg'] } }),
		overrides: { solid: { yellow: { bg: '800', pseudos: { ':hover': { fg: '100' } } } }, light: { primary: { fg: '700', dark: { fg: '200' } } } },
	});

	expect(Object.keys(variants.colorVars('yellow')).filter(k => k.startsWith('--wui-cv-solid'))).toEqual(['--wui-cv-solid-bg', '--wui-cv-solid-fg-\\:hover']);
	expect(variants.colorVars('primary')['@dark']).toMatchObject({ '--wui-cv-light-fg': 'var(--p-light-fg, var(--wui-c-200))' });
});

it('gives the `compound` mode rules for `c-accent-*` and the dark values of an override, and no rule to the reset', () => {
	const { variants } = gen({ overrideMode: 'compound', overrides: { solid: { yellow: { 'bg-accent': '700' } }, light: { yellow: { fg: '700', dark: { fg: '200' } } } } });

	expect(variants.cssVars('solid')['&.c-accent-yellow' as never]).toEqual({ '--wui-v-bg-accent': 'var(--wui-c-accent-700)' });
	expect(variants.cssVars('light')['&.c-yellow' as never]).toEqual({ '--wui-v-fg': 'var(--wui-c-700)', '@dark': { '--wui-v-fg': 'var(--wui-c-200)' } });
	expect(Object.keys(variants.resetVars()).every(k => k.startsWith('--'))).toBe(true);
});

it('gives the root the dark overrides of `c-accent-accent`, and drops the forwarding of a removed palette', () => {
	const { colors: root } = gen({ overrides: { solid: { accent: { 'bg-accent': '700', dark: { 'bg-accent': '400' } } } } });
	const removed = gen({ build: b => b.setColor('primary', { vars: '--p', overrideVars: {} }).removeColor('primary') });

	expect(root.rootVars()['@dark']).toMatchObject({ '--wui-cv-solid-bg-accent': 'var(--wui-c-accent-400)' });
	expect(removed.variants.cssVars('solid')).toEqual(gen().variants.cssVars('solid'));
});

// #41
describe('sizes', () => {
	const spacing = (k: string) => k === 'px' ? '1px' : `${Number(k) / 4}rem`;
	const sizes = (config: Config = {}) => create(config).generator({ ...theme, spacing, fontSize: () => ['1rem', '1.5rem'] }).sizes;

	it('has `md` next to `default`, with the same values, which follow a change of `default`', () => {
		const s = sizes({ build: b => b.updateSize('default', s => void (s.spacing['3'] = '1rem')) });

		expect(s.names()).toEqual(['default', 'md', 'xs', 'sm', 'lg', 'xl']);
		expect(s.cssVars('md')).toEqual(s.cssVars('default'));
		expect(s.cssVars('md')['--wui-s-spacing-3']).toBe('1rem');
	});

	it('writes keys of your own, strings and numbers, after the built-in variables', () => {
		const brand: Size = { ring: '2px', spacing: { '1': '1px', '1.5': '2px', '2': '3px', '3': '4px', '4': '5px' }, text: ['1rem', '1.5rem'], 'line-clamp': 2 };
		const s = sizes({ build: b => b
			.addSize('brand', () => brand)
			.addComponent('field', ({ vars }) => ({ name: 'field', style: { outlineWidth: vars.size('ring') } })) });

		expect(Object.keys(s.cssVars('default'))).toEqual([
			'--wui-s-spacing-1', '--wui-s-spacing-2', '--wui-s-spacing-3', '--wui-s-spacing-4', '--wui-s-spacing-1\\.5',
			'--wui-s-text', '--wui-s-line-height',
		]);
		expect(Object.entries(s.cssVars('brand')).slice(-3)).toEqual([['--wui-s-line-height', '1.5rem'], ['--wui-s-ring', '2px'], ['--wui-s-line-clamp', '2']]);
	});

	it('makes `md` a size of its own when it is updated, added or removed', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const updated = sizes({ build: b => b.updateSize('md', s => void (s.spacing['3'] = '1rem')) });
		const added = sizes({ build: b => b.addSize('md', () => ({ spacing: { '1': '1px', '1.5': '2px', '2': '3px', '3': '4px', '4': '5px' }, text: '2rem' })) });
		const removed = sizes({ build: b => b.removeSize('md') });

		expect(updated.cssVars('md')['--wui-s-spacing-3']).toBe('1rem');
		expect(updated.cssVars('default')['--wui-s-spacing-3']).toBe('0.75rem');
		expect(added.names()).toEqual(['default', 'xs', 'sm', 'lg', 'xl', 'md']);
		expect(added.cssVars('md')['--wui-s-text']).toBe('2rem');
		expect(removed.names()).not.toContain('md');
		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});
});
