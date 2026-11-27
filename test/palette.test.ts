import { describe, expect, it } from 'vitest';
// The built package: the root does not depend on it, and the typecheck takes no source outside its project.
import * as theme from '../packages/windiui-core/dist/theme.mjs';
import type { ColorShade } from '../packages/windiui-core/dist/index.mjs';
import { tailwind3, tailwind4 } from '../packages/windiui-tailwind/dist/palettes.mjs';

// #46: the palette model of the theme engine.

const { createEngine, resolvePalette, fitPalette, adjustCurves, samplePalette, parsePalette, generatePalette, parseColor } = theme;
type PaletteSpec = theme.PaletteSpec;

const SHADES = Object.keys(tailwind4.red) as ColorShade[];
const CHROMATIC = Object.keys(tailwind4).slice(0, 17) as (keyof typeof tailwind4)[];
const BRANDS = ['#f5b301', '#2563eb', '#e11d48', '#16a34a', '#7c3aed', '#0ea5e9', '#c2410c', '#0d9488'];

/** A color as OKLab, `oklch()` as it is written, out of the sRGB gamut too. */
function oklab(color: string) {
	const lch = /^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)$/.exec(color)?.slice(1).map(Number);
	if (lch) return [lch[0] / 100, lch[1] * Math.cos(lch[2] * Math.PI / 180), lch[1] * Math.sin(lch[2] * Math.PI / 180)];

	const [r, g, b] = parseColor(color).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
	const [l, m, s] = [
		0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b,
		0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
		0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
	].map(Math.cbrt);
	return [
		0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
	];
}

/** The difference of two colors, as ΔE OK times 100: about 2 is the smallest a viewer tells apart. */
const deltaE = (a: string, b: string) => {
	const [x, y] = [oklab(a), oklab(b)];
	return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const maxDeltaE = (a: Record<string, string>, b: Record<string, string>) => Number(Math.max(...SHADES.map(s => deltaE(a[s], b[s]))).toFixed(2));
const wcag = createEngine();

describe('the functions', () => {
	it('are exported from `@windi-ui/core/theme` and on the engine, where a palette base names a palette of the engine', () => {
		const engine = createEngine({}, { palettes: tailwind4 });
		for (const name of ['resolvePalette', 'fitPalette', 'adjustCurves', 'samplePalette', 'parsePalette', 'generatePalette'] as const) {
			expect(theme[name]).toBeTypeOf('function');
			expect(engine[name]).toBeTypeOf('function');
		}

		expect(engine.resolvePalette({ palette: 'teal' })).toEqual(tailwind4.teal);
		expect(engine.resolvePalette({ palette: 'teal' }, { palettes: tailwind3 })).toEqual(tailwind3.teal);
		expect(() => resolvePalette({ palette: 'teal' })).toThrow('WindiUI: unknown palette "teal".');
		expect(() => resolvePalette({ seeds: '#fff' } as never)).toThrow('WindiUI: a palette spec needs one of palette, seed, shades or curves.');
	});

	it('read `oklch()` as CSS does: the lightness from 0 to 100 %, the chroma from 0', () => {
		const spec = parsePalette({ seed: 'oklch(150% 0.1 30)', pins: { 950: 'oklch(-50% -1 0)' } });
		expect(resolvePalette(spec, { format: 'oklch' })).toEqual(resolvePalette({ seed: 'oklch(100% 0.1 30)', pins: { 950: 'oklch(0% 0 0)' } }, { format: 'oklch' }));
	});

	it('return `palette` and `shades` without `adjust` and `pins` as they are, byte for byte', () => {
		for (const name of Object.keys(tailwind4)) expect(resolvePalette({ palette: name }, { palettes: tailwind4, format: 'oklch' })).toStrictEqual(tailwind4[name as 'red']);
		expect(resolvePalette({ shades: tailwind3.red })).toStrictEqual(tailwind3.red);
		expect(resolvePalette({ shades: tailwind4.red }, { format: 'hex' })).toStrictEqual(tailwind4.red);
	});

	it('scale the four adjustments with `amount`', () => {
		const curves = fitPalette(tailwind4.blue);
		expect(adjustCurves(curves, { amount: 50, hue: 20, saturation: 100 })).toEqual(adjustCurves(curves, { hue: 10, saturation: 50 }));
		expect(adjustCurves(curves, { amount: 0, hue: 20, contrast: 50 })).toEqual(curves);
	});
});

describe('a seed', () => {
	it.each(BRANDS)('%s is kept at its anchor, in a ramp that falls in lightness and stays in sRGB', seed => {
		const palette = generatePalette(seed);
		expect(Object.values(palette)).toContain(seed);

		const lightness = Object.values(resolvePalette({ seed }, { format: 'oklch' })).map(c => oklab(c)[0]);
		expect(lightness).toEqual([...lightness].sort((a, b) => b - a));

		// In gamut: an `oklch()` shade and its hex, which is clipped to sRGB, are the same color
		for (const shade of SHADES) expect(deltaE(resolvePalette({ seed }, { format: 'oklch' })[shade], palette[shade])).toBeLessThan(0.5);
	});

	it('is kept at the anchor it is given, and not at all without `keepSeed`', () => {
		expect(generatePalette('#f5b301', { anchor: '400' })['400']).toBe('#f5b301');
		expect(Object.values(generatePalette('#f5b301', { anchor: '400', keepSeed: false }))).not.toContain('#f5b301');
	});

	it('compared with the nearest palette of Tailwind 4, by color and by the contrast of white text on 600 and 700', () => {
		const rows = BRANDS.map(seed => {
			const palette = generatePalette(seed);
			const nearest = CHROMATIC.reduce((best, name) => {
				const distance = Math.min(...SHADES.map(s => deltaE(seed, tailwind4[name][s])));
				return distance < best.distance ? { name, distance } : best;
			}, { name: CHROMATIC[0], distance: Infinity }).name;
			const white = (p: Record<string, string>, shade: ColorShade) => Number(wcag.contrast('#fff', p[shade]).toFixed(2));

			return {
				seed,
				nearest,
				maxDeltaE: maxDeltaE(palette, tailwind4[nearest]),
				white600: [white(palette, '600'), white(tailwind4[nearest], '600')],
				white700: [white(palette, '700'), white(tailwind4[nearest], '700')],
			};
		});

		expect(rows).toMatchSnapshot();
	});
});

describe('fitting', () => {
	it.each([['Tailwind 4', tailwind4], ['Tailwind 3', tailwind3]])('then sampling each palette of %s: the largest difference per palette', (_, palettes) => {
		const errors = Object.fromEntries(Object.entries(palettes).map(([name, palette]) => [name, maxDeltaE(palette, samplePalette(fitPalette(palette), {}, { format: 'oklch' }))]));
		expect(errors).toMatchSnapshot();
		expect(Math.max(...Object.values(errors))).toBeLessThan(4);
	});

	it('takes any two or more shades', () => {
		const curves = fitPalette({ 100: tailwind3.blue['100'], 900: tailwind3.blue['900'] });
		const palette = samplePalette(curves);
		expect(deltaE(palette['100'], tailwind3.blue['100'])).toBeLessThan(0.5);
		expect(deltaE(palette['900'], tailwind3.blue['900'])).toBeLessThan(0.5);
		expect(() => fitPalette({ 500: '#000' })).toThrow('at least two shades');
	});
});

describe('a pin', () => {
	const adjusts = [{}, { amount: 200, lightness: 30, contrast: 50, saturation: 200, hue: 180 }, { lightness: -30, contrast: -50, saturation: -100, hue: -180 }];
	const bases: PaletteSpec[] = [{ seed: '#f5b301' }, { palette: 'blue' }, { shades: tailwind3.lime }, { curves: fitPalette(tailwind4.rose) }];

	it('is hit exactly with any adjustment, and wins over the seed', () => {
		for (const base of bases) for (const adjust of adjusts) {
			const palette = resolvePalette({ ...base, adjust, pins: { 900: '#5a3d00', 50: 'rgb(255 250 240)' } }, { palettes: tailwind4 });
			expect([palette['900'], palette['50']]).toEqual(['#5a3d00', '#fffaf0']);
		}

		expect(resolvePalette({ seed: '#f5b301', anchor: '400', pins: { 400: '#ffcc00' } })['400']).toBe('#ffcc00');
		expect(resolvePalette({ seed: '#f5b301', pins: { 500: 'oklch(62.3% 0.214 259.815)' } }, { format: 'oklch' })['500']).toBe('oklch(62.3% 0.214 259.815)');
	});
});

describe('parsePalette', () => {
	const curve = { y0: 0.97, y1: 0.28, p1x: 0.3, p1y: 0.9, p2x: 0.6, p2y: 0.5 };
	const curves = { lightness: curve, chroma: { ...curve, y0: 0.02, y1: 0.1, p1y: 0.2, p2y: 0.25 }, hue: { ...curve, y0: 250, y1: 265, p1y: 255, p2y: 260 } };

	it('returns a valid spec as it is', () => {
		const specs = [
			{ seed: '#f5b301', anchor: '400', keepSeed: false, adjust: { amount: 80, contrast: 10 }, pins: { 900: '#5a3d00' } },
			{ palette: 'blue', adjust: { lightness: -30, saturation: 200, hue: -180 } },
			{ shades: tailwind4.red, pins: { 500: 'rgb(255, 0, 0)' } },
			{ curves },
		];
		for (const spec of specs) expect(parsePalette(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
	});

	it.each<[string, unknown, string]>([
		['not an object', [], '(root)'],
		['no base', { adjust: {} }, '(root)'],
		['two bases', { seed: '#fff', palette: 'blue' }, '(root)'],
		['an unknown key', { seed: '#fff', tint: 1 }, 'tint'],
		['`anchor` without `seed`', { palette: 'blue', anchor: '500' }, 'anchor'],
		['an empty palette name', { palette: '' }, 'palette'],
		['a variable as the seed', { seed: 'var(--brand)' }, 'seed'],
		['a named color', { seed: 'red' }, 'seed'],
		['an anchor that is no shade', { seed: '#fff', anchor: '550' }, 'anchor'],
		['a `keepSeed` that is no boolean', { seed: '#fff', keepSeed: 'yes' }, 'keepSeed'],
		['a missing shade', { shades: { ...tailwind3.red, 950: undefined } }, 'shades.950'],
		['an unknown shade', { shades: { ...tailwind3.red, 1000: '#000' } }, 'shades.1000'],
		['a shade that is no color', { shades: { ...tailwind3.red, 500: 'hsl(0 50% 50%)' } }, 'shades.500'],
		['a missing curve', { curves: { lightness: curve, chroma: curve } }, 'curves.hue'],
		['a missing curve value', { curves: { ...curves, hue: { ...curve, p2y: undefined } } }, 'curves.hue.p2y'],
		['a handle beyond 1', { curves: { ...curves, lightness: { ...curve, p1x: 1.2 } } }, 'curves.lightness.p1x'],
		['a lightness beyond 1.5', { curves: { ...curves, lightness: { ...curve, y0: 1.6 } } }, 'curves.lightness.y0'],
		['a negative chroma', { curves: { ...curves, chroma: { ...curves.chroma, p2y: -0.1 } } }, 'curves.chroma.p2y'],
		['a hue beyond 720', { curves: { ...curves, hue: { ...curve, y1: 800 } } }, 'curves.hue.y1'],
		['a curve value that is not finite', { curves: { ...curves, hue: { ...curve, y1: '1' } } }, 'curves.hue.y1'],
		['an amount beyond 200', { seed: '#fff', adjust: { amount: 201 } }, 'adjust.amount'],
		['a lightness beyond 30', { seed: '#fff', adjust: { lightness: -31 } }, 'adjust.lightness'],
		['a contrast beyond 50', { seed: '#fff', adjust: { contrast: 51 } }, 'adjust.contrast'],
		['a saturation below -100', { seed: '#fff', adjust: { saturation: -101 } }, 'adjust.saturation'],
		['a hue beyond 180', { seed: '#fff', adjust: { hue: 181 } }, 'adjust.hue'],
		['an adjustment that is no integer', { seed: '#fff', adjust: { hue: 1.5 } }, 'adjust.hue'],
		['an unknown adjustment', { seed: '#fff', adjust: { gamma: 1 } }, 'adjust.gamma'],
		['a pin at no shade', { seed: '#fff', pins: { 25: '#000' } }, 'pins.25'],
		['a pin that is no color', { seed: '#fff', pins: { 500: 5 } }, 'pins.500'],
	])('rejects %s, with its path', (_, json, path) => {
		expect(() => parsePalette(json)).toThrow(`WindiUI: invalid palette spec at \`${path}\``);
	});

	it('keeps a spec with curves and 11 pins under 1 KB', () => {
		const spec = { curves: fitPalette(tailwind4.blue), adjust: { amount: 100, lightness: -30, contrast: -50, saturation: -100, hue: -180 }, pins: tailwind4.indigo };
		expect(JSON.stringify(parsePalette(spec)).length).toBeLessThan(1024);
	});
});

// The ramps of these specs are a compatibility surface: a change to one is a breaking release.
it('resolves the specs of the golden file to the same shades', async () => {
	const specs: [PaletteSpec, ('hex' | 'oklch')?][] = [
		[{ seed: '#f5b301', anchor: '400', adjust: { amount: 80, contrast: 10 }, pins: { 900: '#5a3d00' } }],
		[{ seed: '#2563eb' }],
		[{ seed: '#16a34a', keepSeed: false }],
		[{ seed: 'oklch(62% 0.2 30)' }, 'oklch'],
		[{ palette: 'blue', adjust: { saturation: -20 } }],
		[{ palette: 'red', adjust: { hue: 30, lightness: 5 } }, 'oklch'],
		[{ shades: tailwind3.teal, pins: { 500: '#0f766e' } }],
		[{ curves: { lightness: { y0: 0.97, y1: 0.28, p1x: 0.3, p1y: 0.9, p2x: 0.6, p2y: 0.5 }, chroma: { y0: 0.02, y1: 0.08, p1x: 0.5, p1y: 0.15, p2x: 0.5, p2y: 0.25 }, hue: { y0: 250, y1: 270, p1x: 0.3, p1y: 255, p2x: 0.7, p2y: 265 } } }],
	];

	const golden = specs.map(([spec, format]) => ({ spec, format, shades: resolvePalette(spec, { palettes: tailwind4, format }) }));
	await expect(`${JSON.stringify(golden, null, '\t')}\n`).toMatchFileSnapshot('__snapshots__/palette/golden.json');
});
