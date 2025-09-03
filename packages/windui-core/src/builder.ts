import type { ColorsGenerator } from "./colors";
import type { VariantsGenerator } from "./variants";
import type { SizesGenerator } from "./size";
import type { ComponentsGenerator } from './components/generator';

type BuilderFunc<TFunc extends (...args: any) => void> = (...args: Parameters<TFunc>) => Builder;

export interface Builder {
	colorsNames: () => string[];
	variantsNames: () => string[];
	sizesNames: () => string[];
	componentsNames: () => string[];

	addVariant: BuilderFunc<VariantsGenerator['add']>;
	addSize: BuilderFunc<SizesGenerator['add']>;
	addComponent: BuilderFunc<ComponentsGenerator['add']>;

	updateVariant: BuilderFunc<VariantsGenerator['update']>;
	updateSize: BuilderFunc<SizesGenerator['update']>;
	updateComponent: BuilderFunc<ComponentsGenerator['update']>;

	removeVariant: BuilderFunc<VariantsGenerator['remove']>;
	removeSize: BuilderFunc<SizesGenerator['remove']>;
	removeComponent: BuilderFunc<ComponentsGenerator['remove']>;
}

export function createBuilder(colors: ColorsGenerator, variants: VariantsGenerator, sizes: SizesGenerator, components: ComponentsGenerator): Builder {
	return {
		colorsNames: () => colors.names(),
		variantsNames: () => variants.names(),
		sizesNames: () => sizes.names(),
		componentsNames: () => components.names(),

		addVariant(name, builder) {
			variants.add(name, builder);
			return this;
		},
		addSize(name, builder) {
			sizes.add(name, builder);
			return this;
		},
		addComponent(name, builder) {
			components.add(name, builder);
			return this;
		},

		updateVariant(name, builder) {
			variants.update(name, builder);
			return this;
		},
		updateSize(name, builder) {
			sizes.update(name, builder);
			return this;
		},
		updateComponent(name, builder) {
			components.update(name, builder);
			return this;
		},

		removeVariant(name) {
			variants.remove(name);
			return this;
		},
		removeSize(name) {
			sizes.remove(name);
			return this;
		},
		removeComponent(name) {
			components.remove(name);
			return this;
		},
	};
}
