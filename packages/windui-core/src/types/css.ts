import type { Properties as _Properties, Pseudos } from "csstype";

type Expand<T, TKey extends string | number | symbol = string, TValue = any> = T & Record<TKey, TValue>;

declare module 'csstype' {
	export interface Properties<TLength, TTime> {
		[key: string]: string | number | Properties<TLength, TTime>;
	}
}

export type Properties = _Properties<string>;
export type Rules = Record<string, Properties>;
export type ExpandedPseudos = Expand<Partial<Record<Pseudos, Properties>>, string, Properties>;
export type { Pseudos };
export type { PropertyValue, AtRules, AdvancedPseudos, SimplePseudos, Property, AtRule, DataType } from 'csstype';
