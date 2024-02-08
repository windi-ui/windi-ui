import type { ThemeProvider, CSS } from "@/types";
import type { VarsProvider } from "@/varsProvider";

type Expand<T, TKey extends string | number | symbol = string, TValue = any> = T & {
	[key in TKey]: TValue;
};

export type ComponentBuilder = (vars: VarsProvider, theme: ThemeProvider) => IComponent;

export interface IComponent {
	name: string,
	style: CSS.Properties,
	pseudos?: Expand<Partial<Record<CSS.Pseudos, CSS.Properties>>, string, CSS.Properties>,
	applyVariant?: boolean,
	applyVariantPseudos?: boolean,
}
