/** A color as sRGB channels from 0 to 1. */
export type Rgb = [number, number, number];

/** A contrast metric: how well `fg` reads on `bg`. */
export type ContrastMetric = (fg: Rgb, bg: Rgb) => number;

const HEX = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const FUNCTION = /^(rgba?|oklch)\(\s*([^()]*)\)$/i;

/** A channel of `rgb()` or `oklch()`: `none` is 0, a percentage is taken of `full`, and a hue may end in `deg`. */
function channel(token: string, full: number) {
	if (token === 'none') return 0;
	if (!/^[+-]?(\d*\.)?\d+(e[+-]?\d+)?(%|deg)?$/i.test(token)) throw new Error(`WindiUI: "${token}" is not a number.`);
	const value = parseFloat(token);
	return token.endsWith('%') ? value / 100 * full : value;
}

const toSrgb = (x: number) => x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;

/** OKLCH to sRGB (https://bottosson.github.io/posts/oklab/), clipped to its gamut. */
function oklch(l: number, c: number, h: number): Rgb {
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
	].map(x => toSrgb(Math.min(1, Math.max(0, x)))) as Rgb;
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

	const [, fn, args] = FUNCTION.exec(color) ?? [];
	const tokens = args?.split(/[\s,/]+/).filter(Boolean) ?? [];
	if (tokens.length < 3) throw new Error(`WindiUI: cannot parse the color "${value}".`);

	if (fn.toLowerCase() === 'oklch') {
		return oklch(channel(tokens[0], 1), channel(tokens[1], 0.4), channel(tokens[2], 0));
	}

	return tokens.slice(0, 3).map(t => Math.min(1, Math.max(0, channel(t, 255) / 255))) as Rgb;
}

/** The relative luminance of WCAG 2. */
function luminance(rgb: Rgb) {
	const [r, g, b] = rgb.map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio of WCAG 2, from 1 to 21; the order of the two colors does not matter. */
export const wcag2: ContrastMetric = (fg, bg) => {
	const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};
