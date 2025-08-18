type Expand<T, TKey extends string | number | symbol = string, TValue = any> = T & Record<TKey, TValue>;

declare module 'csstype' {
	export interface Properties {
		[key: string]: string | number | Properties;
	}

	export type Rules = Record<string, Properties>;
	export type ExpandedPseudos = Expand<Partial<Record<Pseudos, Properties>>, string, Properties>
}

export * as CSS from 'csstype';
