import type { CSS } from "@/types";
import type { BuilderContext } from "@/base";
import type { ApplyVariant, ApplyVariantPseudos } from "@/variants";
import type { ColorContext } from "@/colors";
import type { VariantContext } from "@/variants";

export interface ComponentBuilderContext extends BuilderContext {
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
