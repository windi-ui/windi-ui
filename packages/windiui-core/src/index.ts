import type { ThemeProvider } from './types';
import { resolveConfig, defineConfig, type ColorOptions, type ColorsConfig, type ColorValue, type Config, type DarkSelectorOption, type OverrideMode, type OverrideVars, type PresetName, type VariantScope } from './config';
import { varsProvider } from './vars';
import { ColorsGenerator } from "./colors";
import { VariantsGenerator } from "./variants";
import { SizesGenerator } from "./size";
import { ComponentsGenerator } from './components/generator';
import { createBuilder } from './builder';
import { calibrate, literalPalette, type CalibrateOptions, type CalibrationPolicy } from './theme/calibrate';
import { wcag2 } from './theme/contrast';
import { createResolver } from './theme/resolve';

export interface Generator {
	readonly colors: ColorsGenerator;
	readonly variants: VariantsGenerator;
	readonly sizes: SizesGenerator;
	readonly components: ComponentsGenerator;
}

export function create(config: Config) {
	const rConfig = resolveConfig(config);
	const vars = varsProvider(rConfig.prefix);
	const reported = new Set<string>();

	/** Warns once per instance, for each source, about the names that are not palettes. */
	const notPalettes = (source: string, names: string[]) => {
		if (!names.length || reported.has(source)) return;
		reported.add(source);
		console.warn(`WindiUI: ${source} names ${names.map(c => `"${c}"`).join(', ')}, which ${names.length > 1 ? 'are not palettes' : 'is not a palette'}.`);
	};

	return {
		vars,
		config: rConfig,
		generator(theme: ThemeProvider): Generator {
			const ctx = { vars, theme };
			const variants = new VariantsGenerator(ctx, rConfig.variantScope, rConfig.overrideMode);
			const colors = new ColorsGenerator(ctx, rConfig.colors, variants, rConfig.debug);
			const sizes = new SizesGenerator(ctx);
			const components = new ComponentsGenerator({ ...ctx, colors, variants }, rConfig.componentPrefix);

			const calibrations: [CalibrationPolicy, CalibrateOptions?][] = [];
			const builder = createBuilder(colors, variants, sizes, components, calibrations);
			for (const preset of rConfig.presets) preset.build(builder);
			rConfig.build?.(builder);

			for (const [variant, overrides] of Object.entries(rConfig.overrides ?? {})) {
				for (const [color, override] of Object.entries(overrides)) {
					variants.override(variant, color, override);
				}
			}

			if (calibrations.length) {
				const { resolve, root } = createResolver(vars, colors, variants);
				for (const [policy, options] of calibrations) {
					// The colors with a class and literal shades; a palette given by CSS variables is calibrated at runtime
					const names = colors.names(true);
					const targets = names.filter(c => !(c.startsWith('accent-') && names.includes(c.slice(7))) && variants.hasColor(c)).flatMap(name => {
						const palette = literalPalette(Object.fromEntries(colors.resolve(name)!));
						return palette ? [{ name, palette, anchor: colors.anchors.get(name) }] : [];
					});

					const { overrides, report } = calibrate({ variants: variants.names(), resolve, root, metric: wcag2 }, targets, policy, options);
					for (const [variant, byColor] of Object.entries(overrides)) {
						for (const [color, override] of Object.entries(byColor)) variants.override(variant, color, override, true);
					}

					const rejected = report.filter(r => !r.strategy).map(r => `${r.variant} ${r.color} ${r.mode} ${r.state}`);
					if (rejected.length) console.warn(`WindiUI: calibration leaves ${rejected.length} pairs below the policy: ${rejected.join(', ')}.`);
				}
			}

			// After `build`, which can add a color that `colors.only` or an override names
			const palettes = colors.names(true);
			notPalettes('`colors.only`', colors.unknownOnly());
			notPalettes('an override', variants.overrideColors().filter(c => !palettes.includes(c) && c !== 'default' && c !== 'accent'));

			return { colors, variants, sizes, components };
		}
	};
}

export { varsProvider, type VarsProvider } from './vars';
export type { Builder } from './builder';
export { defineConfig };
export { definePreset, type Preset, type PresetOptions } from './preset';
export type { ColorOptions, ColorsConfig, ColorValue, Config, DarkSelectorOption, OverrideMode, OverrideVars, PresetName, VariantScope };
export type * from './types';
export { FALLBACK_PALETTES, withAlpha, type ColorShade, type ExColorShade } from './colors';
export type { PaletteSpec } from './theme/palette';
export type { CalibrateOptions, CalibrationCell, CalibrationCheck, CalibrationFix, CalibrationPolicy, CalibrationStrategy, CalibrationStrategyFunction } from './theme/calibrate';
export type { Size, SizeProperty } from './size';
export type { Variant, VariantOverride, VariantProperties as VariantProps, ApplyVariant, ApplyVariantMainProp, ApplyVariantSubProp, ApplyVariantProp } from './variants';
