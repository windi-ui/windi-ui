import { findPackageJSON, createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import type { ThemeProvider } from 'windui-core';
import type { CSS } from 'windui-core';
import type { default as Plugin } from 'tailwindcss/plugin';
import type { default as WithAlphaVariable } from 'tailwindcss/lib/util/withAlphaVariable';
import { hslToRgb } from './utils/color';

type MDefault<T> = T extends { default: infer U } ? U : T;
function _interopDefaultCompat<T, TR = MDefault<T>>(e: T): TR { return ((e && typeof e === 'object' && 'default' in e) ? e.default : e) as TR; }
const require = createRequire(import.meta.url);

const flattenColorPalette = _interopDefaultCompat(
	require(require.resolve('tailwindcss/lib/util/flattenColorPalette', { paths: [process.cwd()] }) as 'tailwindcss/lib/util/flattenColorPalette'));

type PluginAPI = Parameters<Parameters<typeof Plugin>[0]>[0];

const NUM_REGEX = /(\d*\.\d+|\d+)/;
const ANGLE_REGEX = new RegExp(`^${NUM_REGEX.source}(deg|rad|grad|turn)?$`);
const PERCENT_REGEX = new RegExp(`^${NUM_REGEX.source}%?$`);

export function createTailwindTheme(tw: PluginAPI): TailwindTheme {
	try {
		const twPkgPath = findPackageJSON(import.meta.resolve('tailwindcss', process.cwd()));
		if (twPkgPath) {
			const twPkg = JSON.parse(readFileSync(twPkgPath, { encoding: 'utf8' })) as { version: string };
			if (twPkg.version.startsWith('4.')) {
				return new TailwindV4Theme(tw);
			} else if (twPkg.version.startsWith('3.')) {
				return new TailwindV3Theme(tw);
			}

			console.warn(`Unsupported Tailwind CSS version: ${twPkg.version}. Expected 3.x or 4.x.`);
		}
	} catch (e) {
		console.error('Failed to read Tailwind CSS package.json:', e);
	}

	return new TailwindV3Theme(tw);
}

export abstract class TailwindTheme implements ThemeProvider {
	abstract readonly ver: 3 | 4;

	protected theme: PluginAPI['theme'];

	constructor(pluginApi: PluginAPI) {
		this.theme = pluginApi.theme;
	}

	colors(): Record<string, string>;
	colors(name: string): string | Record<string, string>;
	colors(name?: string): string | Record<string, string>;
	colors(name?: string) {
		const cname = name ? `colors.${name}` : 'colors';
		const c = this.theme<string | Record<string, string>>(cname);

		return (typeof c === 'object') ? flattenColorPalette(c) : c;
	}

	spacing(name: string) {
		return this.theme<string>(`spacing[${name}]`);
	}

	fontSize(name: string) {
		return this.theme<string>(`fontSize[${name}]`);
	}

	abstract colorValue(value: string, alpha?: number | string): string;

	abstract applyTextColor(value: string, target: CSS.Properties, alpha?: number | string): void;

	abstract applyBackgroundColor(value: string, target: CSS.Properties, alpha?: number | string): void;

	abstract applyBorderColor(value: string, target: CSS.Properties, alpha?: number | string): void;
}

export class TailwindV4Theme extends TailwindTheme {
	readonly ver = 4;

	constructor(pluginApi: PluginAPI) {
		super(pluginApi);
	}

	colorValue(value: string, alpha?: number | string): string {
		return this.withAlpha(value, alpha);
	}

	applyTextColor(value: string, target: CSS.Properties, alpha?: number | string): void {
		target.color = this.withAlpha(value, alpha);
	}

	applyBackgroundColor(value: string, target: CSS.Properties, alpha?: number | string): void {
		target.backgroundColor = this.withAlpha(value, alpha);
	}

	applyBorderColor(value: string, target: CSS.Properties, alpha?: number | string): void {
		target.borderColor = this.withAlpha(value, alpha);
	}

	// https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/src/utilities.ts#L165C1-L182C2
	private withAlpha(value: string, alpha?: string | number): string {
		if (alpha == null || alpha === '') return value;

		// Convert numeric values (like `0.5`) to percentages (like `50%`) so they
		// work properly with `color-mix`. Assume anything that isn't a number is
		// safe to pass through as-is, like `var(--my-opacity)`.
		const alphaAsNumber = Number(alpha);
		if (!Number.isNaN(alphaAsNumber)) {
			alpha = `${alphaAsNumber * 100}%`;
		}

		// No need for `color-mix` if the alpha is `100%`
		if (alpha === '100%') {
			return value;
		}

		if (typeof alpha === 'string' && alpha.startsWith('var(')) {
			alpha = `calc(${alpha} * 100%)`;
		}

		return `color-mix(in oklab, ${value} ${alpha}, transparent)`;
	}
}

export class TailwindV3Theme extends TailwindTheme {
	readonly ver = 3;

	private readonly withAlphaVariable = _interopDefaultCompat(require('tailwindcss/lib/util/withAlphaVariable'));
	private readonly parseColorFormat = require('tailwindcss/lib/util/pluginUtils').parseColorFormat;
	private readonly parseColor = require('tailwindcss/lib/util/color').parseColor;

	private corePlugins: (p: string) => boolean;

	constructor(pluginApi: PluginAPI) {
		super(pluginApi);
		this.corePlugins = (p) => pluginApi.corePlugins(p);
	}

	colors(): Record<string, string>;
	colors(name: string): string | Record<string, string>;
	colors(name?: string) {
		const c = super.colors(name);
		return (typeof c === 'string') ? this.colorToRgb(c) : this.colorsToRgb(c);
	}

	colorValue(value: string, alpha?: number | string): string {
		const c = this.parseRgbFormat(value);
		return typeof c === 'string' ? c : c({ opacityValue: alpha?.toString() });
	}

	applyTextColor(value: string, target: CSS.Properties, alpha?: number | string) {
		this.applyColor({
			color: value,
			property: 'color',
			variable: '--tw-text-opacity'
		}, 'textOpacity', target, alpha);
	}

	applyBackgroundColor(value: string, target: CSS.Properties, alpha?: number | string) {
		this.applyColor({
			color: value,
			property: 'background-color',
			variable: '--tw-bg-opacity'
		}, 'backgroundOpacity', target, alpha);
	}

	applyBorderColor(value: string, target: CSS.Properties, alpha?: number | string) {
		this.applyColor({
			color: value,
			property: 'border-color',
			variable: '--tw-border-opacity'
		}, 'borderOpacity', target, alpha);
	}

	private applyColor(args: Parameters<typeof WithAlphaVariable>[0], opacityPlugin: string, target: CSS.Properties, alpha?: number | string) {
		args = {
			...args,
			color: this.parseRgbFormat(args.color as string),
		};

		Object.assign(target, this.corePlugins?.(opacityPlugin)
			? this.withAlphaVariable(args)
			: { [args.property]: this.toColorValue(args.color, alpha) });

		if (alpha != null && alpha !== '' && args.variable in target) {
			const alphaValue = alpha.toString();
			target[args.variable] = alphaValue;
		}
	}

	private toColorValue(maybeFunction: string | ((a: { opacityValue?: string }) => string), alpha?: number | string): string {
		return typeof maybeFunction === 'function'
			? maybeFunction((alpha != null && alpha !== '') ? { opacityValue: alpha.toString() } : {})
			: maybeFunction;
	}

	private parseRgbFormat(color: string) {
		return this.parseColorFormat(`rgb(${color} / <alpha-value>)`);
	}

	private colorsToRgb(colors: Record<string, string>) {
		for (const c in colors) {
			if (c === 'black' || c === 'white' || (!c.startsWith('c-') && (/^(?:.+-)?(?:50|950|[1-9]00)$/.exec(c))))
				colors[c] = this.colorToRgb(colors[c]);
		}

		return colors;
	}

	private colorToRgb(color: string): string {
		const parsed = this.parseColor(color, { loose: true });

		if (parsed?.mode.startsWith('rgb')) {
			return parsed.color.join(' ');
		} else if (parsed?.mode.startsWith('hsl')) {
			// Convert HSL to RGB
			if (parsed.color.length === 3) {
				const rh = ANGLE_REGEX.exec(parsed.color[0]);
				const rs = PERCENT_REGEX.exec(parsed.color[1]);
				const rl = PERCENT_REGEX.exec(parsed.color[2]);

				if (rh && rs && rl) {
					const h = parseFloat(rh[1]) / (rh[2] === 'rad' ? 2 * Math.PI : rh[2] === 'grad' ? 400 : rh[2] === 'turn' ? 1 : 360);
					const s = parseFloat(rs[1]) / 100;
					const l = parseFloat(rl[1]) / 100;

					return hslToRgb(h, s, l).join(' ');
				}
			}
		}

		console.warn(`Unsupported color format: ${color}`);
		return color;
	}
}

export { flattenColorPalette };
