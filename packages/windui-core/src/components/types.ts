import type { ThemeProvider, CSS } from "@/types";
import type { VarsProvider } from "@/vars";

export type ComponentBuilder = (vars: VarsProvider, theme: ThemeProvider) => IComponent;

export interface IComponent {
	name: string,
	style: CSS.Properties,
	pseudos?: CSS.ExpandedPseudos,
	applyVariant?: boolean | ('text' | 'background' | 'border')[],
	applyVariantPseudos?: boolean,
}
