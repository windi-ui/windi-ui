import { oklchToRgb, toLinear, type Lch } from './oklab';

/** A color as sRGB channels from 0 to 1. */
export type Rgb = [number, number, number];

/** A contrast metric: how well `fg` reads on `bg`. */
export type ContrastMetric = (fg: Rgb, bg: Rgb) => number;

const HEX = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const FUNCTION = /^(rgba?|oklch)\(\s*([^()]*)\)$/i;

/** A channel of `rgb()` or `oklch()`: `none` is 0, and a percentage is taken of `full`. */
function channel(token: string, full: number) {
	if (token === 'none') return 0;
	const value = parseFloat(token);
	if (Number.isNaN(value)) throw new Error(`WindiUI: "${token}" is not a number.`);
	return token.endsWith('%') ? value / 100 * full : value;
}

/**
 * Parses a literal color: hex (`#fff`, `#a16207`, with or without alpha), `rgb()` / `rgba()` and `oklch()`, in the
 * comma or the space syntax. Alpha is ignored: blend a translucent color over what is behind it first. Throws on
 * anything else, such as a `var()`.
 */
export function parseColor(value: string): Rgb {
	const color = value.trim();

	const hex = HEX.exec(color)?.[1];
	if (hex) {
		const full = hex.length < 5 ? hex.replace(/./g, '$&$&') : hex;
		return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb;
	}

	const lch = parseOklch(color);
	if (lch) return oklchToRgb(lch);

	return channels(color).slice(0, 3).map(t => Math.min(1, Math.max(0, channel(t, 255) / 255))) as Rgb;
}

/** The arguments of `rgb()` or `oklch()`; throws on anything else. */
function channels(value: string) {
	const tokens = FUNCTION.exec(value)?.[2].split(/[\s,/]+/).filter(Boolean) ?? [];
	if (tokens.length < 3) throw new Error(`WindiUI: cannot parse the color "${value}".`);
	return tokens;
}

/** The channels of an `oklch()` color, unclipped; `undefined` for another form. */
export function parseOklch(value: string): Lch | undefined {
	const color = value.trim();
	if (!/^oklch\(/i.test(color)) return;

	const tokens = channels(color);
	return [channel(tokens[0], 1), channel(tokens[1], 0.4), channel(tokens[2].replace(/deg$/, ''), 0)];
}

/** The relative luminance of WCAG 2. */
export function luminance(rgb: Rgb) {
	const [r, g, b] = rgb.map(toLinear);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio of WCAG 2, from 1 to 21; the order of the two colors does not matter. */
export const wcag2: ContrastMetric = (fg, bg) => {
	const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};
