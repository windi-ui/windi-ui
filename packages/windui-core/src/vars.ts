import { cssEsc } from './utils';
import type { ColorShade, ExColorShade } from './colors';
import type { Size } from './size';
import type { Variant } from './variant';


export type VarType = 'c' | 'v' | 's';
export type VarName<T extends VarType = VarType> = `${T}-${string}`;
export type CSSVarName<T extends VarType = VarType> = `--${string}-${VarName<T>}`;
export type CSSVarValue<T extends VarType = VarType> = `var(${CSSVarName<T>})`;
export type CSSValues = Record<string, string | Record<string, string>>;

export interface VarsProvider {
	c(n: string): CSSVarName<'c'>;
	v(n: string): CSSVarName<'v'>;
	s(n: string): CSSVarName<'s'>;

	color: {
		(name: ExColorShade): CSSVarValue<'c'>;
		default(name: string): CSSVarValue<'c'>;
		accent(name: string): CSSVarValue<'c'>;
	};
	size(name: 'text' | `spacing-${keyof Size['spacing']}`): CSSVarValue<'s'>;
	variant(name: keyof Variant): CSSVarValue<'v'>;
}

export function varsProvider(prefix: string): VarsProvider {
	function vName<T extends VarType>(name: VarName<T>): CSSVarName<T> {
		return `--${prefix}-${name}`;
	}

	function varFunc<T extends VarType>(v: CSSVarName<T>): CSSVarValue<T> {
		return `var(${cssEsc(v)})`;
	}

	const c = (v: string) => vName(`c-${v}`);
	const v = (v: string) => vName(`v-${v}`);
	const s = (v: string) => vName(`s-${v}`);

	function color(name: ExColorShade) {
		return varFunc(c(name));
	}

	color.default = (name: ColorShade) => color(`default-${name}`);
	color.accent = (name: ColorShade) => color(`accent-${name}`);

	return {
		c, v, s,
		color,
		variant(name) {
			return varFunc(v(name));
		},
		size(name) {
			return varFunc(s(name));
		}
	};
}

export function cssVars<TKey extends string>(
	obj: CSSValues,
	keyMap: (p: string) => TKey,
	vars: Record<string, string> = {}
): Record<TKey, string> {
	for (const p in obj) {
		const val = obj[p];
		if (typeof val === 'string') {
			vars[cssEsc(keyMap(p))] = val;
		} else {
			cssVars(val, (cp) => `${keyMap(p)}-${cp}`, vars);
		}
	}

	return vars;
}
