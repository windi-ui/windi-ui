import { ThemeProvider } from './types';
import { cssVars, type VarsProvider, type CSSVarName } from './vars';

export type ColorShade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';
export type ExColorShade = ColorShade | `default-${ColorShade}` | `accent-${ColorShade}` | 'black' | 'white';
export type ColorVars = Record<CSSVarName<'c'>, string>;

export interface ColorContext {
	toValue(name: ExColorShade | (string & {}), alpha?: number | string): string;
}

export interface ColorProvider extends ColorContext {
	names(): string[];
	cssVars(name: string): ColorVars;
	rootVars(): ColorVars;
}

const COLOR_SHADE_REGEX = /50|950|[1-9]00/;
const COLOR_SHADE_EX_REGEX = new RegExp(`^((?:(default|accent)-)?(${COLOR_SHADE_REGEX.source})|black|white)$`);
const COLOR_PALETTE_REGEX = new RegExp(`^(.+)-(${COLOR_SHADE_REGEX.source})$`);

const FLAT_COLORS: Record<string, string> = {
	black: '#000',
	white: '#fff',
};

function getColorMap(colors: Record<string, string>) {
	const cMap = {
		palette: new Map<string, Map<ColorShade, string>>(),
		custom: new Map<string, string>()
	}

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
			console.warn(`Color palette "${cName}" does not have all 11 shades (50, 100, ..., 950).`);
			cMap.palette.delete(cName);
			for (const [sKey, sVal] of shades) {
				cMap.custom.set(`${cName}-${sKey}`, sVal);
			}
		}
	}

	return cMap;
}

export function colorsProvider(vars: VarsProvider, theme: ThemeProvider): ColorProvider {
	const colorMap = getColorMap(theme.colors());

	function cCssVars(name: string) {
		let palette = colorMap.palette.get(name);
		let accentVars = false;

		if (!palette) {
			if (name.startsWith('accent-')) {
				name = name.replace(/^accent-/, '');
				palette = colorMap.palette.get(name);
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
		return cssVars(cObj, n => vars.c(accentVars ? `accent-${n}` : n));
	}

	return {
		names() {
			const cNames = [...colorMap.palette.keys()];
			cNames.push(...cNames.map(c => `accent-${c}`));
			return cNames;
		},
		cssVars(name: string) {
			return cCssVars(name);
		},
		rootVars() {
			const cRoot: ColorVars = {};
			for (const mn in FLAT_COLORS) {
				cRoot[vars.c(mn)] = colorMap.custom.get(mn) || FLAT_COLORS[mn];
			}

			const dc = cCssVars('default');
			Object.assign(cRoot, dc);

			function addPalette(suffix: string, palette: Map<ColorShade, string>) {
				for (const [shade, color] of palette) {
					cRoot[vars.c(`${suffix}-${shade}`)] = color;
				}
			}

			addPalette('default', colorMap.palette.get('default') || new Map());
			addPalette('accent', colorMap.palette.get('accent') || new Map());

			return cRoot;
		},

		toValue(name, alpha) {
			return theme.colorValue(name.match(COLOR_SHADE_EX_REGEX) ? vars.color(name as ExColorShade) : name, alpha);
		}
	}
}
