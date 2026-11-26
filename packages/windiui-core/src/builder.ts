import type { ColorOptions, ColorValue } from "./config";
import type { ColorsGenerator } from "./colors";
import type { VariantOverride, VariantsGenerator } from "./variants";
import type { BuilderContext } from "./base";
import type { SizesGenerator } from "./size";
import type { ComponentsGenerator } from './components/generator';
import type { CalibrateOptions, CalibrationPolicy } from './theme/calibrate';

type BuilderFunc<TFunc extends (...args: any) => void> = (...args: Parameters<TFunc>) => Builder;

export interface Builder {
	/** @param all also the palettes that `colors.only` leaves without a class */
	colorsNames: (all?: boolean) => string[];
	variantsNames: () => string[];
	sizesNames: () => string[];
	componentsNames: () => string[];

	/** `options` are for the host: the generator itself has no use for them. */
	addColor: (name: string, value: ColorValue, options?: ColorOptions) => Builder;
	addVariant: BuilderFunc<VariantsGenerator['add']>;
	addSize: BuilderFunc<SizesGenerator['add']>;
	addComponent: BuilderFunc<ComponentsGenerator['add']>;

	/** Adds a color, or replaces the one of that name. */
	setColor: Builder['addColor'];
	/** Adds a variant, or replaces the one of that name, `default` included. */
	setVariant: BuilderFunc<VariantsGenerator['set']>;
	setSize: BuilderFunc<SizesGenerator['set']>;
	setComponent: BuilderFunc<ComponentsGenerator['set']>;

	updateColor: BuilderFunc<ColorsGenerator['update']>;
	updateVariant: BuilderFunc<VariantsGenerator['update']>;
	updateSize: BuilderFunc<SizesGenerator['update']>;
	updateComponent: BuilderFunc<ComponentsGenerator['update']>;

	removeColor: BuilderFunc<ColorsGenerator['remove']>;
	removeVariant: BuilderFunc<VariantsGenerator['remove']>;
	removeSize: BuilderFunc<SizesGenerator['remove']>;
	removeComponent: BuilderFunc<ComponentsGenerator['remove']>;

	/** Sets values of a variant for one or more colors, over the overrides they have. */
	overrideVariant: (variant: string, colors: string | string[], override: VariantOverride | ((ctx: BuilderContext) => VariantOverride)) => Builder;

	/**
	 * Fills overrides so that every variant on every palette with literal shades meets `policy`, light and dark, at
	 * rest and on hover. It runs once the build is done, after `build` and the `overrides` option, and an explicit
	 * override wins over what it computes.
	 */
	calibrate: (policy: CalibrationPolicy, options?: CalibrateOptions) => Builder;
}

/** @param calibrations collects the calls of `calibrate`, which run when the build is done */
export function createBuilder(
	colors: ColorsGenerator, variants: VariantsGenerator, sizes: SizesGenerator, components: ComponentsGenerator,
	calibrations: [CalibrationPolicy, CalibrateOptions?][] = []
): Builder {
	return {
		colorsNames: all => colors.names(all),
		variantsNames: () => variants.names(),
		sizesNames: () => sizes.names(),
		componentsNames: () => components.names(),

		addColor(name, value) {
			colors.addColor(name, value);
			return this;
		},
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

		setColor(name, value) {
			colors.setColor(name, value);
			return this;
		},
		setVariant(name, builder) {
			variants.set(name, builder);
			return this;
		},
		setSize(name, builder) {
			sizes.set(name, builder);
			return this;
		},
		setComponent(name, builder) {
			components.set(name, builder);
			return this;
		},

		updateColor(name, builder) {
			colors.update(name, builder);
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

		removeColor(name) {
			colors.remove(name);
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

		overrideVariant(variant, colors, override) {
			variants.override(variant, colors, override);
			return this;
		},

		calibrate(policy, options) {
			calibrations.push([policy, options]);
			return this;
		},
	};
}
