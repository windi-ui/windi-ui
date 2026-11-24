import { cssVars, type CSSVarName } from './vars';
import { type BuilderContext, VarsGeneratorBase } from "./base";
import type { ColorValue, Config } from "./config";

export type ColorShade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';
export type ExColorShade = ColorShade | `default-${ColorShade}` | `accent-${ColorShade}` | 'black' | 'white';
export type ColorVars = Record<CSSVarName<'c'>, string>;

export interface ColorContext {
	toValue(name: ExColorShade | (string & {}), alpha?: number | string): string;
}

export const COLOR_SHADES: ColorShade[] = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const COLOR_SHADE_REGEX = /50|950|[1-9]00/;
const COLOR_SHADE_EX_REGEX = new RegExp(`^((?:(default|accent)-)?(${COLOR_SHADE_REGEX.source})|black|white)$`);
const COLOR_PALETTE_REGEX = new RegExp(`^(.+)-(${COLOR_SHADE_REGEX.source})$`);

const FLAT_COLORS: Record<string, string> = {
	black: '#000',
	white: '#fff',
};

function getColorMap(colors: Record<string, string>, debug?: boolean) {
	const cMap = {
		palette: new Map<string, Map<ColorShade, string>>(),
		custom: new Map<string, string>()
	};

	for (const key in colors) {
		const value = colors[key];
		const mRes = COLOR_PALETTE_REGEX.exec(key);
		if (mRes) {
			const cName = mRes[1];
			if (cName === 'c') continue;

			if (!cMap.palette.has(cName)) {
				cMap.palette.set(cName, new Map());
			}

			cMap.palette.get(cName)!.set(mRes[2] as ColorShade, value);
		} else {
			cMap.custom.set(key, value);
		}
	}

	for (const [cName, shades] of cMap.palette) {
		if (shades.size !== 11) {
			if (debug) console.warn(`Color palette "${cName}" does not have all 11 shades (50, 100, ..., 950).`);
			cMap.palette.delete(cName);
			for (const [sKey, sVal] of shades) {
				cMap.custom.set(`${cName}-${sKey}`, sVal);
			}
		}
	}

	return cMap;
}

export class ColorsGenerator extends VarsGeneratorBase<Map<ColorShade, string>, ColorVars> implements ColorContext {
	private readonly colors: ReturnType<typeof getColorMap>;
	protected readonly items: Map<string, Map<ColorShade, string>>;

	constructor(ctx: BuilderContext, options: Pick<Config, 'default' | 'accent' | 'debug'> = {}) {
		super(ctx);
		this.colors = getColorMap(this.theme.colors(), options.debug);
		this.items = this.colors.palette;

		for (const name of ['default', 'accent'] as const) {
			const value = options[name];
			if (value == null) continue;

			const palette = this.resolve(value);
			if (!palette) throw new Error(`WindUI: the \`${name}\` option does not give a palette.`);
			this.items.set(name, palette);
		}
	}

	/** The 11 shades of a palette given by name, by CSS variables or as the shades themselves. */
	resolve(value: ColorValue): Map<ColorShade, string> | undefined {
		if (typeof value === 'string') {
			const palette = this.items.get(value);
			if (!palette) console.error(`Color "${value}" not found.`);
			return palette && new Map(palette);
		}

		if ('vars' in value) {
			return new Map(COLOR_SHADES.map(s => [s, `var(${value.vars}-${s})`]));
		}

		const missing = COLOR_SHADES.filter(s => !value[s]);
		if (missing.length) {
			console.error(`A color needs all 11 shades; ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} missing.`);
			return;
		}

		return new Map(COLOR_SHADES.map(s => [s, this.theme.toColor?.(value[s]) ?? value[s]]));
	}

	names() {
		const cNames = super.names();
		cNames.push(...cNames.map(c => `accent-${c}`));
		return cNames;
	}

	cssVars(name: string) {
		let palette = this.items.get(name);
		let accentVars = false;

		if (!palette) {
			if (name.startsWith('accent-')) {
				name = name.replace(/^accent-/, '');
				palette = this.items.get(name);
				if (palette) {
					accentVars = true;
				} else {
					console.error(`Color "${name}" not found.`);
					return {};
				}
			} else {
				console.error(`Color "${name}" not found.`);
				return {};
			}

		}

		const cObj = Object.fromEntries(palette.entries());
		return cssVars(cObj, n => this.vars.c(accentVars ? `accent-${n}` : n));
	}

	rootVars() {
		const cRoot: ColorVars = {};
		for (const mn in FLAT_COLORS) {
			cRoot[this.vars.c(mn)] = this.colors.custom.get(mn) ?? FLAT_COLORS[mn];
		}

		const dc = super.rootVars();
		Object.assign(cRoot, dc);

		const addPalette = (suffix: string, palette: Map<ColorShade, string>) => {
			for (const [shade, color] of palette) {
				cRoot[this.vars.c(`${suffix}-${shade}`)] = color;
			}
		};

		addPalette('default', this.items.get('default') ?? new Map<ColorShade, string>());
		addPalette('accent', this.items.get('accent') ?? new Map<ColorShade, string>());

		return cRoot;
	}

	toValue(name: ExColorShade | (string & {}), alpha?: number | string) {
		return this.theme.colorValue(COLOR_SHADE_EX_REGEX.exec(name) ? this.vars.color(name as ExColorShade) : name, alpha);
	}
}
