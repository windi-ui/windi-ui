import { cssVars, type VarsProvider, type CSSVarName } from './vars';

export interface ColorProvider {
	names(): string[];
	cssVars(name: string): Record<CSSVarName<'c'>, string>;
	rootVars(): Record<CSSVarName<'c'>, string>;
}

const COLOR_PALETTE_REGEX = /^(.+)-(50|950|[1-9]00)$/;

const FLAT_COLORS: Record<string, string> = {
	transparent: 'transparent',
	black: '#000',
	white: '#fff',
};

function getColorMap(colors: Record<string, string>) {
	const cMap = {
		palette: new Map<string, Map<string, string>>(),
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

			cMap.palette.get(cName)!.set(mRes[2], value);
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

export function colorsProvider(colors: Record<string, string>, vars: VarsProvider): ColorProvider {
	const colorMap = getColorMap(colors);

	function cCssVars(name: string) {
		const palette = colorMap.palette.get(name);
		if (!palette) {
			console.error(`Color "${name}" not found.`);
			return {};
		}

		const cObj = Object.fromEntries(palette.entries());
		return cssVars(cObj, n => vars.c(n));
	}

	return {
		names() {
			return [...colorMap.palette.keys()];
		},
		cssVars(name: string) {
			return cCssVars(name);
		},
		rootVars() {
			const cRoot: Record<CSSVarName<'c'>, string> = {};
			for (const mn in FLAT_COLORS) {
				cRoot[vars.c(mn)] = colorMap.custom.get(mn) || FLAT_COLORS[mn];
			}

			return Object.assign(cRoot, cCssVars('default'));
		}
	}
}
