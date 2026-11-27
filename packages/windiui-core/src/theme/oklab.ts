import type { Rgb } from './contrast';

// OKLab and OKLCH, after https://bottosson.github.io/posts/oklab/

/** A color as OKLCH: lightness from 0 to 1, chroma, and hue in degrees. */
export type Lch = [number, number, number];

/** sRGB to linear light, and back. */
export const toLinear = (x: number) => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
export const toSrgb = (x: number) => x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;

/** OKLCH to linear sRGB, unclipped: a channel outside 0 to 1 is outside the gamut. */
export function oklchToLinear([l, c, h]: Lch): Rgb {
	const [a, b] = [c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)];
	const [lc, mc, sc] = [
		l + 0.3963377774 * a + 0.2158037573 * b,
		l - 0.1055613458 * a - 0.0638541728 * b,
		l - 0.0894841775 * a - 1.2914855480 * b,
	].map(x => x ** 3);

	return [
		4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
		-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
		-0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc,
	];
}

/** OKLCH to sRGB, clipped to its gamut. */
export const oklchToRgb = (lch: Lch) => oklchToLinear(lch).map(x => toSrgb(Math.min(1, Math.max(0, x)))) as Rgb;

/** sRGB to OKLCH; the hue is from 0 to 360. */
export function rgbToOklch(rgb: Rgb): Lch {
	const [r, g, b] = rgb.map(toLinear);
	const [lc, mc, sc] = [
		0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b,
		0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
		0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
	].map(Math.cbrt);

	const l = 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc;
	const a = 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc;
	const bb = 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc;
	return [l, Math.hypot(a, bb), (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360];
}
