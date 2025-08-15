import type { ThemeProvider, CSS } from "@/types";
import type { ApplyVariant, ApplyVariantPseudos } from "@/variants";
import type { VarsProvider } from "@/vars";

export type ComponentBuilder = (vars: VarsProvider, theme: ThemeProvider) => IComponent;

export interface IComponent {
	name: string,
	style: CSS.Properties,
	pseudos?: CSS.ExpandedPseudos,
	applyVariant?: ApplyVariant,
	applyVariantPseudos?: ApplyVariantPseudos,
}
