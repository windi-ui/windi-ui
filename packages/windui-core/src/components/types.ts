import type { ThemeProvider, CSS } from "@/types";
import type { ApplyVariant, ApplyVariantPseudos } from "@/variants";
import type { VarsProvider } from "@/vars";
import type { ColorContext } from "@/colors";
import type { VariantContext } from "@/variants";

export interface ComponentBuilderContext {
	readonly vars: VarsProvider;
	readonly theme: ThemeProvider;
	readonly colors: ColorContext;
	readonly variants: VariantContext;
}

export type ComponentBuilder = (context: ComponentBuilderContext) => IComponent;

export interface IComponent {
	name: string,
	style: CSS.Properties,
	pseudos?: CSS.ExpandedPseudos,
	applyVariant?: ApplyVariant,
	applyVariantPseudos?: ApplyVariantPseudos,
}
