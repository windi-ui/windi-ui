import { expect, it } from 'vitest';
// The built package: the root does not depend on it, and the typecheck takes no source outside its project.
import { create, type ThemeProvider } from '../packages/windiui-core/dist/index.mjs';

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
