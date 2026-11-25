import { cssEsc } from './utils';
import type { ColorShade, ExColorShade } from './colors';
import type { SizeProperty } from './size';
import { defaultVariantVars, type VariantProperty } from './variants';

export type VarType = 'c' | 'v' | 's' | 'cv';
export type VarName<T extends VarType = VarType> = `${T}-${string}`;
export type CSSVarName<T extends VarType = VarType> = `--${string}-${VarName<T>}`;
export type CSSVarValue<T extends VarType = VarType> = `var(${CSSVarName<T>})`;
export type CSSValues = Record<string, string | number | Record<string, string>>;

export interface VarsProvider {
	c(n: string): CSSVarName<'c'>;
	v(n: string): CSSVarName<'v'>;
	s(n: string): CSSVarName<'s'>;
	/** An override variable, such as `cv('solid-bg')`: a `c-*` class sets it and the `v-*` class reads it. */
	cv(n: string): CSSVarName<'cv'>;

	color: {
		(name: ExColorShade, fallback?: string): CSSVarValue<'c'>;
		default(name: ColorShade, fallback?: string): CSSVarValue<'c'>;
		accent(name: ColorShade, fallback?: string): CSSVarValue<'c'>;
	};
	size(name: SizeProperty, fallback?: string): CSSVarValue<'s'>;
	/** `{ fallback: true }` falls back to the light value of the built-in default variant. */
	variant(name: VariantProperty, fallback?: string | { fallback: true }): CSSVarValue<'v'>;
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
	const cv = (v: string) => vName(`cv-${v}`);

	function color(name: ExColorShade, fallback?: string) {
		return varFunc(c(name), fallback);
	}

	color.default = (name: ColorShade) => color(`default-${name}`);
	color.accent = (name: ColorShade) => color(`accent-${name}`);

	const vars: VarsProvider = {
		c, v, s, cv,
		color,

		variant(name, fallback) {
			if (typeof fallback === 'object') {
				fallback = defaultVariantVars(vars)[cssEsc(v(name))];
			}

			return varFunc(v(name), fallback);
		},
		size(name, fallback) {
			return varFunc(s(name), fallback);
		}
	};

	return vars;
}

export function cssVars<TKey extends string>(
	obj: CSSValues,
	keyMap: (p: string) => TKey,
	vars: Record<string, string> = {}
): Record<TKey, string> {
	for (const p in obj) {
		const val = obj[p];
		if (typeof val === 'string' || typeof val === 'number') {
			vars[cssEsc(keyMap(p))] = String(val);
		} else {
			cssVars(val, (cp) => `${keyMap(p)}-${cp}`, vars);
		}
	}

	return vars;
}
