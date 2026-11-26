import { COLOR_SHADES, type ColorShade } from '../colors';
import { parseColor, parseOklch, type Rgb } from './contrast';
import { oklchToLinear, oklchToRgb, rgbToOklch, type Lch } from './oklab';
import type { Palette, Palettes } from './provider';

/**
 * One OKLCH channel over the ramp: a cubic bezier from `(0, y0)` to `(1, y1)` with the handles `(p1x, p1y)` and
 * `(p2x, p2y)`, where x 0 is shade 50 and x 1 is shade 950.
 */
export interface ChannelCurve {
	y0: number;
	y1: number;
	p1x: number;
	p1y: number;
	p2x: number;
	p2y: number;
}

/** A palette as three curves: lightness from 0 to 1, chroma, and hue in degrees. */
export interface PaletteCurves {
	lightness: ChannelCurve;
	chroma: ChannelCurve;
	hue: ChannelCurve;
}

/** Where a palette comes from: a named palette, one brand color, all 11 shades, or curves. Exactly one. */
export type PaletteBase =
	| { palette: string }
	/**
	 * `anchor` is the shade the seed stands for, left out the shade of the nearest lightness. With `keepSeed`, the
	 * default, the seed is pinned there, so the palette holds it exactly.
	 */
	| { seed: string; anchor?: ColorShade; keepSeed?: boolean }
	| { shades: Palette }
	| { curves: PaletteCurves };

/** A lens over the base of a palette, applied to its curves; the base itself is kept. */
export interface PaletteAdjust {
	/** How much of the four others applies, from 0 to 200 %. Left out, 100. */
	amount?: number;
	/** Shifts the lightness, from -30 to 30 %. */
	lightness?: number;
	/** Spreads the lightness about the middle of the ramp, or narrows it, from -50 to 50 %. */
	contrast?: number;
	/** Scales the chroma, from -100 (gray) to 200 %. */
	saturation?: number;
	/** Turns the hue, from -180 to 180 degrees. */
	hue?: number;
}

/**
 * A palette as a recipe: a base, an adjustment and per-shade pins. Stored as it is, a theme can be opened again
 * with its sliders, curves and pins.
 */
export type PaletteSpec = PaletteBase & {
	adjust?: PaletteAdjust;
	/** An exact color at a shade, which no adjustment moves; the shades around it bend to it smoothly. */
	pins?: Partial<Palette>;
};

export interface SamplePaletteOptions {
	/** `'hex'`, the default, or `'oklch'`, as `oklch(62.3% 0.214 259.815)`. */
	format?: 'hex' | 'oklch';
}

export interface ResolvePaletteOptions extends SamplePaletteOptions {
	/** The palettes a `palette` base names. */
	palettes?: Palettes;
}

// Fitted to the mean lightness and chroma of the 17 chromatic palettes of Tailwind 4.3
const DEFAULT_CURVES: Omit<PaletteCurves, 'hue'> = {
	lightness: { y0: 0.9769, y1: 0.2931, p1x: 0.25, p1y: 0.9123, p2x: 0.1, p2y: 0.9789 },
	chroma: { y0: 0.0179, y1: 0.0873, p1x: 0.5, p1y: 0.1175, p2x: 0.25, p2y: 0.3679 },
};
// The width of a pin's pull, in steps of the ramp
const PIN_SPREAD = 1;
// Below this chroma a color is gray, and its hue says nothing
const ACHROMATIC = 1e-4;

const BASES = ['palette', 'seed', 'shades', 'curves'] as const;
const CHANNELS = ['lightness', 'chroma', 'hue'] as const;
const CURVE_KEYS = ['y0', 'y1', 'p1x', 'p1y', 'p2x', 'p2y'] as const;
const CURVE_Y = { lightness: [-0.5, 1.5], chroma: [0, 0.5], hue: [-360, 720] } as const;
const ADJUST = { amount: [0, 200], lightness: [-30, 30], contrast: [-50, 50], saturation: [-100, 200], hue: [-180, 180] } as const;

const clamp = (value: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, value));
const round = (value: number, digits: number) => Number(value.toFixed(digits));
const isEmpty = (value?: object) => !value || !Object.keys(value).length;
/** The x of each shade on the ramp. */
const x = (index: number) => index / 10;

/** A color as OKLCH; `oklch()` is read as it is, out of gamut too. */
const toLch = (color: string): Lch => parseOklch(color) ?? rgbToOklch(parseColor(color));

const bezier = (a: number, b: number, c: number, d: number, t: number) => {
	const u = 1 - t;
	return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/** The parameter of a curve at `x`: with its handles within 0 to 1, x only rises with it. */
function curveT({ p1x, p2x }: Pick<ChannelCurve, 'p1x' | 'p2x'>, x: number) {
	let [lo, hi] = [0, 1];
	for (let i = 0; i < 40; i++) {
		const t = (lo + hi) / 2;
		if (bezier(0, p1x, p2x, 1, t) < x) lo = t;
		else hi = t;
	}
	return (lo + hi) / 2;
}

const curveAt = (curve: ChannelCurve, x: number) => bezier(curve.y0, curve.p1y, curve.p2y, curve.y1, curveT(curve, x));

/** Solves `a * w = b`, by Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[]) {
	const m = a.map((row, i) => [...row, b[i]]);
	const n = b.length;
	for (let col = 0; col < n; col++) {
		const pivot = m.slice(col).reduce((best, row, i) => Math.abs(row[col]) > Math.abs(m[best][col]) ? col + i : best, col);
		[m[col], m[pivot]] = [m[pivot], m[col]];
		for (let row = col + 1; row < n; row++) {
			const f = m[row][col] / m[col][col];
			for (let k = col; k <= n; k++) m[row][k] -= f * m[col][k];
		}
	}

	const w = new Array<number>(n);
	for (let row = n - 1; row >= 0; row--) {
		w[row] = (m[row][n] - m[row].slice(row + 1, n).reduce((sum, v, i) => sum + v * w[row + 1 + i], 0)) / m[row][row];
	}
	return w;
}

// The handles a fit tries: the even spread first, which keeps a tie, then a grid of 0.05
const HANDLES = [[1 / 3, 2 / 3], ...Array.from({ length: 21 * 21 }, (_, i) => [Math.floor(i / 21) / 20, (i % 21) / 20])];
// The second differences of the control points, a small penalty that settles a fit to fewer than four points
const SMOOTH = [[1, -2, 1, 0], [0, 1, -2, 1]];

/** The curve nearest to the points, by weighted least squares over the handles of `HANDLES`. */
function fitCurve(points: { x: number, y: number, w: number }[], bounds: readonly [number, number]): ChannelCurve {
	let best: { error: number, curve: ChannelCurve } | undefined;

	for (const [p1x, p2x] of HANDLES) {
		const rows = points.map(p => {
			const t = curveT({ p1x, p2x }, p.x), u = 1 - t;
			return [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
		});

		const a = [0, 1, 2, 3].map(j => [0, 1, 2, 3].map(k =>
			rows.reduce((sum, r, i) => sum + points[i].w * r[j] * r[k], 0) + SMOOTH.reduce((sum, s) => sum + 1e-6 * s[j] * s[k], 0)));
		const b = [0, 1, 2, 3].map(j => rows.reduce((sum, r, i) => sum + points[i].w * r[j] * points[i].y, 0));
		const [y0, p1y, p2y, y1] = solve(a, b).map(v => clamp(v, bounds));

		const error = rows.reduce((sum, r, i) => sum + points[i].w * (r[0] * y0 + r[1] * p1y + r[2] * p2y + r[3] * y1 - points[i].y) ** 2, 0);
		if (!best || error < best.error - 1e-12) best = { error, curve: { y0, y1, p1x, p1y, p2x, p2y } };
	}

	const { curve } = best!;
	return Object.fromEntries(CURVE_KEYS.map(k => [k, round(curve[k], 4)])) as unknown as ChannelCurve;
}

/**
 * The curves nearest to a ramp, to edit it: any two or more of its 11 shades, as hex, `rgb()` or `oklch()`. The hue
 * of a gray shade counts for nothing.
 */
export function fitPalette(shades: Partial<Palette>): PaletteCurves {
	const given = COLOR_SHADES.flatMap((s, i) => shades[s] ? [{ x: x(i), lch: toLch(shades[s]) }] : []);
	if (given.length < 2) throw new Error('WindiUI: fitting a palette takes at least two shades.');

	// The hue is unwrapped along the ramp, from one colored shade to the next
	let last: number | undefined;
	for (const { lch } of given) {
		if (last != null) lch[2] += Math.round((last - lch[2]) / 360) * 360;
		if (lch[1] > ACHROMATIC) last = lch[2];
	}

	return {
		lightness: fitCurve(given.map(p => ({ x: p.x, y: p.lch[0], w: 1 })), CURVE_Y.lightness),
		chroma: fitCurve(given.map(p => ({ x: p.x, y: p.lch[1], w: 1 })), CURVE_Y.chroma),
		hue: fitCurve(given.map(p => ({ x: p.x, y: p.lch[2], w: p.lch[1] + 1e-6 })), CURVE_Y.hue),
	};
}

/**
 * The curves with an adjustment applied. Contrast spreads the lightness about the middle of its curve, lightness
 * shifts it, saturation scales the chroma and hue turns the hue; `amount` scales all four.
 */
export function adjustCurves(curves: PaletteCurves, { amount = 100, lightness = 0, contrast = 0, saturation = 0, hue = 0 }: PaletteAdjust): PaletteCurves {
	const k = amount / 100;
	const map = (curve: ChannelCurve, f: (y: number) => number): ChannelCurve =>
		({ ...curve, y0: f(curve.y0), p1y: f(curve.p1y), p2y: f(curve.p2y), y1: f(curve.y1) });
	const middle = (curves.lightness.y0 + curves.lightness.y1) / 2;

	return {
		lightness: map(curves.lightness, y => middle + (y - middle) * (1 + contrast * k / 100) + lightness * k / 100),
		chroma: map(curves.chroma, y => y * Math.max(0, 1 + saturation * k / 100)),
		hue: map(curves.hue, y => y + hue * k),
	};
}

const inGamut = (lch: Lch) => oklchToLinear(lch).every(v => v >= -1e-7 && v <= 1 + 1e-7);

/** The color with its chroma reduced until it is in sRGB. */
function toGamut(lch: Lch): Lch {
	if (inGamut(lch)) return lch;

	let [lo, hi] = [0, lch[1]];
	for (let i = 0; i < 30; i++) {
		const c = (lo + hi) / 2;
		if (inGamut([lch[0], c, lch[2]])) lo = c;
		else hi = c;
	}
	return [lch[0], lo, lch[2]];
}

const toHex = (rgb: Rgb) => `#${rgb.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
const toOklch = ([l, c, h]: Lch) => `oklch(${round(l * 100, 1)}% ${round(c, 3)} ${round((h % 360 + 360) % 360, 3)})`;

/**
 * The 11 shades of the curves, with the pins applied: each pinned shade is its pin exactly, and the shades around
 * it are pulled toward it by a Gaussian of about one step. The shades that are not pinned are brought into sRGB by
 * reducing their chroma.
 */
export function samplePalette(curves: PaletteCurves, pins: Partial<Palette> = {}, { format = 'hex' }: SamplePaletteOptions = {}): Palette {
	const lch = COLOR_SHADES.map((_, i): Lch => [curveAt(curves.lightness, x(i)), curveAt(curves.chroma, x(i)), curveAt(curves.hue, x(i))]);

	const pinned = COLOR_SHADES.flatMap((s, i) => pins[s] ? [{ i, lch: toLch(pins[s]) }] : []);
	if (pinned.length) {
		const kernel = (i: number, j: number) => Math.exp(-(((i - j) / PIN_SPREAD) ** 2));
		const matrix = pinned.map(p => pinned.map(q => kernel(p.i, q.i)));

		for (const channel of [0, 1, 2]) {
			const residuals = pinned.map(p => {
				const d = p.lch[channel] - lch[p.i][channel];
				// The hue turns the short way, and a gray pin pulls no hue
				return channel < 2 ? d : p.lch[1] < ACHROMATIC ? 0 : ((d % 360) + 540) % 360 - 180;
			});
			const weights = solve(matrix, residuals);
			for (const [i, value] of lch.entries()) value[channel] += pinned.reduce((sum, p, k) => sum + weights[k] * kernel(i, p.i), 0);
		}
	}

	return Object.fromEntries(COLOR_SHADES.map((s, i) => {
		const pin = pins[s];
		if (pin) return [s, format === 'hex' ? toHex(parseColor(pin)) : toOklch(toLch(pin))];

		const color = toGamut([clamp(lch[i][0], [0, 1]), Math.max(0, lch[i][1]), lch[i][2]]);
		return [s, format === 'hex' ? toHex(oklchToRgb(color)) : toOklch(color)];
	})) as Palette;
}

/** The default curves for a seed: its hue, and the chroma that meets the seed's at the anchor. */
function seedCurves([l, c, h]: Lch, anchor?: ColorShade) {
	const lightness = COLOR_SHADES.map((_, i) => curveAt(DEFAULT_CURVES.lightness, x(i)));
	const index = anchor ? COLOR_SHADES.indexOf(anchor) : lightness.reduce((best, v, i) => Math.abs(v - l) < Math.abs(lightness[best] - l) ? i : best, 0);
	const scale = c / curveAt(DEFAULT_CURVES.chroma, x(index));
	const { chroma } = DEFAULT_CURVES;

	return {
		anchor: COLOR_SHADES[index],
		curves: {
			lightness: DEFAULT_CURVES.lightness,
			chroma: { ...chroma, y0: chroma.y0 * scale, p1y: chroma.p1y * scale, p2y: chroma.p2y * scale, y1: chroma.y1 * scale },
			hue: { y0: h, y1: h, p1x: 1 / 3, p1y: h, p2x: 2 / 3, p2y: h },
		},
	};
}

/** Whether a color value is a palette spec, by its base. */
export const isPaletteSpec = (value: object): value is PaletteSpec => BASES.some(k => k in value);

/**
 * The 11 shades of a palette spec. A `palette` or `shades` base with no `adjust` and no `pins` is returned as it is,
 * byte for byte. Otherwise the base becomes curves (a seed takes the default curves with its hue and chroma), the
 * adjustment applies to them, and they are sampled with the pins. Explicit pins win over the seed's own. Throws
 * for a palette that `palettes` does not have, or a color it cannot read.
 */
export function resolvePalette(spec: PaletteSpec, { palettes = {}, ...options }: ResolvePaletteOptions = {}): Palette {
	const table = 'palette' in spec && Object.hasOwn(palettes, spec.palette) ? palettes[spec.palette] as Palette | undefined : undefined;
	if ('palette' in spec && typeof table !== 'object') throw new Error(`WindiUI: unknown palette "${spec.palette}".`);

	if (isEmpty(spec.adjust) && isEmpty(spec.pins)) {
		if (table) return { ...table };
		if ('shades' in spec) return { ...spec.shades };
	}

	let curves: PaletteCurves;
	let seedPin: Partial<Palette> = {};
	if ('palette' in spec) curves = fitPalette(table!);
	else if ('shades' in spec) curves = fitPalette(spec.shades);
	else if ('curves' in spec) curves = spec.curves;
	else {
		const seeded = seedCurves(toLch(spec.seed), spec.anchor);
		curves = seeded.curves;
		if (spec.keepSeed ?? true) seedPin = { [seeded.anchor]: spec.seed };
	}

	return samplePalette(spec.adjust ? adjustCurves(curves, spec.adjust) : curves, { ...seedPin, ...spec.pins }, options);
}

/** The 11 shades for one brand color: `resolvePalette({ seed, ...options })`. */
export function generatePalette(seed: string, options: { anchor?: ColorShade; keepSeed?: boolean } = {}): Palette {
	return resolvePalette({ seed, ...options });
}

/**
 * Validates a palette spec, such as one read from JSON, and returns it. Throws with the path of the first field that
 * is out of bounds: a base other than exactly one of `palette`, `seed`, `shades` and `curves`, a color other than
 * hex, `rgb()` or `oklch()`, `shades` without all 11, an `adjust` value that is not an integer in its range, a curve
 * value out of its range, or a key it does not know.
 */
export function parsePalette(json: unknown): PaletteSpec {
	const fail = (path: string, problem: string): never => {
		throw new Error(`WindiUI: invalid palette spec at \`${path || '(root)'}\`: ${problem}.`);
	};
	const join = (path: string, key: string) => path ? `${path}.${key}` : key;

	const object = (value: unknown, path: string, keys: readonly string[], required = false) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail(path, 'must be an object');
		const unknown = Object.keys(value).find(k => !keys.includes(k));
		if (unknown) fail(join(path, unknown), 'is not a known key');
		const missing = required && keys.find(k => !(k in value));
		if (missing) fail(join(path, missing), 'is missing');
		return value as Record<string, unknown>;
	};
	const color = (value: unknown, path: string) => {
		try {
			if (typeof value === 'string' && toLch(value).every(Number.isFinite)) return value;
		} catch { }
		return fail(path, 'must be a hex, `rgb()` or `oklch()` color');
	};
	const number = (value: unknown, path: string, [min, max]: readonly [number, number], integer = false) => {
		if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isInteger(value)) || value < min || value > max) {
			fail(path, `must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}`);
		}
		return value as number;
	};
	const map = <K extends string, V>(keys: readonly K[], f: (key: K) => V) => Object.fromEntries(keys.map(k => [k, f(k)]));

	const root = object(json, '', [...BASES, 'anchor', 'keepSeed', 'adjust', 'pins']);
	const bases = BASES.filter(k => k in root);
	if (bases.length !== 1) fail('', `must have exactly one of ${BASES.map(b => `\`${b}\``).join(', ')}`);
	if (bases[0] !== 'seed') for (const key of ['anchor', 'keepSeed']) if (key in root) fail(key, 'is only allowed with `seed`');

	const spec: Record<string, unknown> = {};
	switch (bases[0]) {
		case 'palette':
			if (typeof root.palette !== 'string' || !root.palette) fail('palette', 'must be the name of a palette');
			spec.palette = root.palette;
			break;
		case 'seed':
			spec.seed = color(root.seed, 'seed');
			if ('anchor' in root) {
				if (!COLOR_SHADES.includes(root.anchor as ColorShade)) fail('anchor', 'must be a shade, from `50` to `950`');
				spec.anchor = root.anchor;
			}
			if ('keepSeed' in root) {
				if (typeof root.keepSeed !== 'boolean') fail('keepSeed', 'must be a boolean');
				spec.keepSeed = root.keepSeed;
			}
			break;
		case 'shades': {
			const shades = object(root.shades, 'shades', COLOR_SHADES, true);
			spec.shades = map(COLOR_SHADES, s => color(shades[s], `shades.${s}`));
			break;
		}
		case 'curves': {
			const curves = object(root.curves, 'curves', CHANNELS, true);
			spec.curves = map(CHANNELS, channel => {
				const path = `curves.${channel}`;
				const curve = object(curves[channel], path, CURVE_KEYS, true);
				return map(CURVE_KEYS, k => number(curve[k], `${path}.${k}`, k.endsWith('x') ? [0, 1] : CURVE_Y[channel]));
			});
			break;
		}
	}

	if ('adjust' in root) {
		const adjust = object(root.adjust, 'adjust', Object.keys(ADJUST));
		spec.adjust = map(Object.keys(adjust) as (keyof typeof ADJUST)[], k => number(adjust[k], `adjust.${k}`, ADJUST[k], true));
	}
	if ('pins' in root) {
		const pins = object(root.pins, 'pins', COLOR_SHADES);
		spec.pins = map(Object.keys(pins), s => color(pins[s], `pins.${s}`));
	}

	return spec as PaletteSpec;
}
