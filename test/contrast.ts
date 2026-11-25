import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/** A color as sRGB channels from 0 to 1. */
export type Rgb = [number, number, number];
export type Palettes = Record<string, Record<string, Rgb>>;

const fixture = (name: string) => createRequire(resolve(import.meta.dirname, 'fixtures', name, 'package.json'));

const hex = (value: string): Rgb => {
	const h = value.length === 4 ? value.replace(/\w/g, '$&$&') : value;
	return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
};

/** OKLCH to sRGB, clipped to its gamut, as a browser paints it on an sRGB screen. */
function oklch(l: number, c: number, h: number): Rgb {
	const [a, b] = [c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)];
	const [lc, mc, sc] = [l + 0.3963377774 * a + 0.2158037573 * b, l - 0.1055613458 * a - 0.0638541728 * b, l - 0.0894841775 * a - 1.2914855480 * b].map(x => x ** 3);
	const linear = [
		4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
		-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
		-0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc,
	];
	return linear.map(x => Math.min(1, Math.max(0, x))).map(x => x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055) as Rgb;
}

/** The palettes of the default theme of Tailwind 4, from its `theme.css`. */
export function tailwind4Palettes(): Palettes {
	const css = readFileSync(fixture('tw4').resolve('tailwindcss/theme.css'), 'utf8');
	const palettes: Palettes = {};
	for (const [, name, shade, l, c, h] of css.matchAll(/--color-(\w+)-(\d+): oklch\(([\d.]+)% ([\d.]+) ([\d.]+|none)\)/g)) {
		(palettes[name] ??= {})[shade] = oklch(Number(l) / 100, Number(c), Number(h) || 0);
	}
	return palettes;
}

/** The palettes of the default theme of Tailwind 3. The old names are getters that log a warning, and are left out. */
export function tailwind3Palettes(): Palettes {
	const colors = fixture('tw3')('tailwindcss/colors') as Record<string, unknown>;
	const palettes: Palettes = {};
	for (const [name, { value }] of Object.entries(Object.getOwnPropertyDescriptors(colors))) {
		if (value && typeof value === 'object') {
			palettes[name] = Object.fromEntries(Object.entries(value as Record<string, string>).map(([s, v]) => [s, hex(v)]));
		}
	}
	return palettes;
}

const luminance = (rgb: Rgb) => {
	const [r, g, b] = rgb.map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The WCAG contrast ratio of two opaque colors. */
export function contrast(a: Rgb, b: Rgb) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** `color` at `alpha` over `under`, blended in sRGB as a browser does. */
export const over = (color: Rgb, alpha: number, under: Rgb) => color.map((x, i) => x * alpha + under[i] * (1 - alpha)) as Rgb;
