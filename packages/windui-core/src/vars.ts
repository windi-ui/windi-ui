import { cssEsc } from './utils';
import { type Size } from './size';
import { type Variant } from './variant';

export type VarType = 'c' | 'v' | 's';
export type VarName<T extends VarType = VarType> = `${T}-${string}`;
export type CSSVarName<T extends VarType = VarType> = `--${string}-${VarName<T>}`;

export interface VarsProvider {
	c(n: string): CSSVarName<'c'>;
	v(n: string): CSSVarName<'v'>;
	s(n: string): CSSVarName<'s'>;

	color(name: string): string;
	size(name: 'text' | `spacing-${keyof Size['spacing']}`): string;
	variant(name: keyof Variant): string;
}

export function varsProvider(prefix: string): VarsProvider {
	function vName<T extends VarType>(name: VarName<T>): CSSVarName<T> {
		return `--${prefix}-${name}`;
	}

	function varFunc(v: CSSVarName) {
		return `var(${cssEsc(v)})`;
	}

	const c = (v: string) => vName(`c-${v}`);
	const v = (v: string) => vName(`v-${v}`);
	const s = (v: string) => vName(`s-${v}`);

	return {
		c, v, s,
		color(name) {
			return varFunc(c(name));
		},
		variant(name) {
			return varFunc(v(name));
		},
		size(name) {
			return varFunc(s(name));
		}
	};
}
