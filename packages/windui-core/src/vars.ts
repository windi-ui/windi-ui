import { cssEsc } from './utils';
import type { ColorShade, ExColorShade } from './colors';
import type { Size } from './size';
import type { VariantProps } from './variants';
import { CSS } from './types';

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
		(name: ExColorShade, fallback?: string): CSSVarValue<'c'>;
		default(name: ColorShade, fallback?: string): CSSVarValue<'c'>;
		accent(name: ColorShade, fallback?: string): CSSVarValue<'c'>;
	};
	size(name: 'text' | `spacing-${keyof Size['spacing']}`, fallback?: string): CSSVarValue<'s'>;
	variant(name: keyof VariantProps | `${keyof VariantProps}-${CSS.SimplePseudos}`, fallback?: string): CSSVarValue<'v'>;
}

export function varsProvider(prefix: string): VarsProvider {
	function vName<T extends VarType>(name: VarName<T>): CSSVarName<T> {
		return `--${prefix}-${name}`;
	}

	function varFunc<T extends VarType>(v: CSSVarName<T>, fallback?: string): CSSVarValue<T> {
		return `var(${cssEsc(v)}${fallback ? `, ${fallback}` : ''})`;
	}

	const c = (v: string) => vName(`c-${v}`);
	const v = (v: string) => vName(`v-${v}`);
	const s = (v: string) => vName(`s-${v}`);

	function color(name: ExColorShade, fallback?: string) {
		return varFunc(c(name), fallback);
	}

	color.default = (name: ColorShade) => color(`default-${name}`);
	color.accent = (name: ColorShade) => color(`accent-${name}`);

	return {
		c, v, s,
		color,

		variant(name, fallback) {
			return varFunc(v(name), fallback);
		},
		size(name, fallback) {
			return varFunc(s(name), fallback);
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
