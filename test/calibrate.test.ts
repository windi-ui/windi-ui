import { describe, expect, it } from 'vitest';
// The built package: the root does not depend on it, and the typecheck takes no source outside its project.
import type { Config } from '../packages/windiui-core/dist/index.mjs';
import { createEngine, parseColor, wcag2, type CalibrationResult, type Palette } from '../packages/windiui-core/dist/theme.mjs';
import { tailwind3, tailwind4 } from '../packages/windiui-tailwind/dist/palettes.mjs';
import { contrast, over, type Rgb } from './contrast';

// #47: contrast calibration in the theme engine.

const nuxtUi: Config = { presets: ['nuxt-ui'] };
const FLAT = Object.fromEntries(Object.keys(tailwind4.red).map(s => [s, '#ffd84d'])) as Palette;

/**
 * The cells of `fg` on `bg` below `ratio` once `overrides` are in the config, light and dark, at rest and on hover,
 * computed here from the resolved colors with a translucent background over white, or gray 950 in dark mode.
 */
function below(config: Config, palettes: Record<string, Palette>, overrides: CalibrationResult['overrides'], ratio = 4.5) {
	const engine = createEngine({ ...config, overrides }, { palettes });
	const backdrop = { light: [1, 1, 1] as Rgb, dark: parseColor(palettes.gray[950]) };
	return engine.variants().flatMap(variant => engine.colors().flatMap(color => (['light', 'dark'] as const).flatMap(mode => (['rest', 'hover'] as const).flatMap(state => {
		const { fg, bg } = engine.resolve(variant, color)[mode][state];
		const under = over(parseColor(bg.color), bg.opacity, backdrop[mode]);
		return contrast(over(parseColor(fg.color), fg.opacity, under), under) < ratio ? [`${variant} ${color} ${mode} ${state}`] : [];
	}))));
}

describe.each([['Tailwind 3', tailwind3], ['Tailwind 4', tailwind4]])('with the palettes of %s', (_, palettes) => {
	const engine = createEngine(nuxtUi, { palettes });
	const result = engine.calibrate(engine.colors(), { text: 4.5 });

	it('makes every pair pass 4.5:1, for the built-in and the `nuxt-ui` variants, light and dark, at rest and on hover', () => {
		expect(below(nuxtUi, palettes, {}).length).toBeGreaterThan(0);
		expect(below(nuxtUi, palettes, result.overrides)).toEqual([]);
		expect(result.report.filter(r => r.strategy !== 'shift-bg')).toEqual([]);
	});

	it('gives no override to a color that passes: `v-solid` changes for the nine palettes that fail on 600 only', () => {
		expect(Object.keys(result.overrides.solid)).toEqual(['orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky']);
		expect(result.overrides.solid.yellow).toEqual({ bg: '700', pseudos: { ':hover': { bg: '800' } } });
	});

	it('calibrates hover in both modes, with a dark value where the variant has its own', () => {
		expect(result.overrides.light.yellow).toEqual({ fg: '700', pseudos: { ':hover': { bg: '700' } }, dark: { pseudos: { ':hover': { bg: '700' } } } });
	});

	// #52: the matrix of `windiui audit`
	it('audits every cell, a translucent background over the backdrop, with the fix calibration gives each that fails', () => {
		const { cells, skipped, overrides } = engine.audit({ text: 4.5 });
		expect(cells).toHaveLength(engine.variants().length * engine.colors().length * 4);
		expect(skipped).toEqual([]);
		expect(overrides).toEqual(result.overrides);

		const failing = cells.filter(c => c.failing.length);
		expect(failing.map(c => `${c.variant} ${c.color} ${c.mode} ${c.state}`)).toEqual(below(nuxtUi, palettes, {}));
		expect(failing.filter(c => !c.fix)).toEqual([]);
		expect(cells.find(c => c.variant === 'solid' && c.color === 'yellow' && c.state === 'hover')?.fix).toEqual({ bg: '800' });
	});
});

describe('calibrate', () => {
	const engine = createEngine(nuxtUi, { palettes: tailwind4 });

	it('is deterministic', () => {
		const result = engine.calibrate(engine.colors(), { text: 4.5, border: 3 }, { strategy: ['shift-bg', 'flip-fg'] });
		expect(engine.calibrate(engine.colors(), { text: 4.5, border: 3 }, { strategy: ['shift-bg', 'flip-fg'] })).toEqual(result);
		expect({
			overrides: result.overrides,
			report: result.report.map(r => [r.variant, r.color, r.mode, r.state, r.strategy, ...Object.entries(r.contrast).map(([k, v]) => `${k} ${v.toFixed(2)}`)].join(' ')),
		}).toMatchSnapshot();
	});

	it('passes with `flip-fg` for any ramp, a flat one too, and rejects nothing with `shift-bg` then `flip-fg`', () => {
		const flip = engine.calibrate({ flat: FLAT }, { text: 4.5, border: 3 }, { strategy: 'flip-fg' });
		expect(flip.report.length).toBeGreaterThan(0);
		expect(flip.report.filter(r => r.strategy !== 'flip-fg')).toEqual([]);
		expect(flip.overrides.solid.flat).toEqual({ fg: 'black', pseudos: { ':hover': { fg: 'black' } } });

		const { report } = engine.calibrate({ ...Object.fromEntries(engine.colors().map(c => [c, c])), flat: FLAT }, { text: 4.5, border: 3 }, { strategy: ['shift-bg', 'flip-fg'] });
		expect(report.filter(r => !r.strategy)).toEqual([]);
		expect(new Set(report.map(r => r.strategy))).toEqual(new Set(['shift-bg', 'flip-fg']));
	});

	it('checks a translucent background over each backdrop', () => {
		expect(engine.calibrate(['blue'], { text: 4.5 }).overrides.outline).toBeUndefined();

		const { overrides, report } = engine.calibrate(['blue'], { text: 4.5, backdrops: { light: ['white', 'default-200'] } });
		expect(overrides.outline.blue).toEqual({ fg: '700' });
		const rest = report.find(r => r.variant === 'outline' && r.mode === 'light' && r.state === 'rest')!;
		expect(rest.contrast.text).toBeCloseTo(engine.contrast(tailwind4.blue[700], tailwind4.gray[200]), 6);
	});

	it('walks `fg` with `shift-bg` when a faint background cannot pass by its own shade, and gives dark its own value', () => {
		const tint = createEngine({ build: b => b.addVariant('tint', ({ vars }) => ({ bg: vars.color('500'), 'bg-opacity': '0.1', fg: vars.color('600'), border: vars.color('500'), 'border-opacity': '0' })) }, { palettes: tailwind4 });
		const { overrides, report } = tint.calibrate(['yellow'], { text: 4.5 });
		// The light `fg` also applies in dark, where it fails on the dark backdrop
		expect(overrides.tint.yellow).toEqual({ fg: '700', dark: { fg: '600' } });
		expect(report.filter(r => !r.strategy)).toEqual([]);
	});

	it('takes a contrast function in the policy', () => {
		const metric = (fg: Rgb, bg: Rgb) => wcag2(fg, bg) * 4.5 / 7;
		const { overrides, report } = engine.calibrate(engine.colors(), { text: 4.5, metric }, { strategy: ['shift-bg', 'flip-fg'] });
		expect(report.filter(r => !r.strategy)).toEqual([]);
		expect(below(nuxtUi, tailwind4, overrides, 7)).toEqual([]);
	});

	it('keeps the seed\'s shade with `anchor-seed`, and falls through to the next strategy for other colors', () => {
		const { overrides, report } = engine.calibrate({ brand: { seed: '#f5b301' }, yellow: 'yellow' }, { text: 4.5 }, { strategy: ['anchor-seed', 'shift-bg'] });
		expect(overrides.solid.brand).toEqual({ bg: '300', fg: '950', pseudos: { ':hover': { bg: '400', fg: '950' } } });
		expect(report.find(r => r.variant === 'solid' && r.color === 'brand')!.strategy).toBe('anchor-seed');
		expect(overrides.solid.yellow).toEqual({ bg: '700', pseudos: { ':hover': { bg: '800' } } });
	});

	it('takes a strategy of your own, and names it in the report', () => {
		const black = (cell: { failing: (fix: object) => string[] }) => cell.failing({ fg: 'black' }).length ? undefined : { fg: 'black' as const };
		const { overrides, report } = engine.calibrate(['yellow'], { text: 4.5 }, { strategy: black });
		expect(overrides.solid.yellow).toEqual({ fg: 'black' });
		expect(new Set(report.map(r => r.strategy))).toEqual(new Set(['black']));
	});

	it('leaves the values of an explicit override, in dark mode too, and reports what stays below the policy', () => {
		const explicit = createEngine({ overrides: { solid: { amber: { bg: '500' } } } }, { palettes: tailwind4 });
		const shift = explicit.calibrate(['amber'], { text: 4.5 });
		expect(shift.overrides.solid).toBeUndefined();
		expect(shift.report.filter(r => r.variant === 'solid').map(r => [r.mode, r.state, r.strategy])).toEqual([['light', 'rest', undefined], ['dark', 'rest', undefined]]);

		expect(explicit.calibrate(['amber'], { text: 4.5 }, { strategy: 'flip-fg' }).overrides.solid.amber).toEqual({ fg: '950' });

		// A variant with no hover takes the default variant's dark hover `bg`, so the light override does not hold there
		const inherited = createEngine({ build: b => b.addVariant('x', ({ vars }) => ({ bg: vars.color('500'), fg: vars.color('950'), border: vars.color('500') })).overrideVariant('x', 'yellow', { pseudos: { ':hover': { bg: '200' } } }) }, { palettes: tailwind4 });
		const shifted = inherited.calibrate(['yellow'], { text: 4.5 });
		expect(shifted.overrides.x.yellow).toEqual({ dark: { pseudos: { ':hover': { bg: '600' } } } });
		expect(shifted.report.filter(r => !r.strategy)).toEqual([]);
	});

	it('rejects a color or a backdrop it cannot read', () => {
		expect(() => engine.calibrate(['nope'], { text: 4.5 })).toThrow('WindiUI: unknown color "nope".');
		const vars = createEngine({ build: b => b.addColor('brand', { vars: '--brand' }) }, { palettes: tailwind4 });
		expect(() => vars.calibrate(['brand'], { text: 4.5 })).toThrow('WindiUI: cannot calibrate "brand": its shades are not literal colors.');
		expect(vars.audit({ text: 4.5 }).skipped).toEqual(['brand']);
		expect(() => engine.calibrate(['red'], { text: 4.5, backdrops: { dark: ['var(--page)'] } })).toThrow('WindiUI: cannot read the dark backdrop "var(--page)"');

		// The default dark backdrop, `default-950`, is then a variable: only the checks that need no backdrop are made
		const neutral = createEngine({ colors: { default: { vars: '--neutral' } } }, { palettes: tailwind4 }).calibrate(['yellow'], { text: 4.5 });
		expect(neutral.overrides.solid.yellow).toEqual({ bg: '700', pseudos: { ':hover': { bg: '800' } } });
		expect(neutral.overrides.outline.yellow).toEqual({ fg: '700' });
		// An audit would count the cells it leaves out as passing
		expect(() => createEngine({ colors: { default: { vars: '--neutral' } } }, { palettes: tailwind4 }).audit({ text: 4.5 })).toThrow('WindiUI: cannot read the default dark backdrop "default-950"');
	});
});
