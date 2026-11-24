import { default as createPlugin } from 'tailwindcss/plugin';
import type { CSSRuleObject, DarkModeConfig } from 'tailwindcss/types/config';
import { create, type Config, type ColorShade, type ApplyVariantMainProp, type ApplyVariantSubProp } from "@windi-ui/core";
import { CONFIG, isLoadingConfig, loadWindUIConfig } from './config';
import { createTailwindTheme } from './theme';
import { getDarkSelector, applyDark, toDarkMode, VARIANT_DARK } from './utils/darkMode';
import { tailwindAtLeast } from './utils/version';

function keyValuePairs(
	keys: string[],
	val = (k: string) => k
): Record<string, string> {
	return keys.reduce((acc, k) => {
		acc[k] = val(k);
		return acc;
	}, {} as Record<string, string>);
}

const VARIANT_UTILS = { v: 'default', 'v-soft': 'soft', 'v-muted': 'muted', 'v-accent': 'accent' } as const;

type UtilExtra = { modifier: string | null };

// `{}` leaves an empty rule on Tailwind 3; `null` and `undefined` throw on Tailwind 4.
const NOTHING = [] as unknown as CSSRuleObject;

/** Tailwind also calls a `matchUtilities` callback for arbitrary values (`bg-[#123456]`, `c-[foo]`), which emit nothing. */
function known<T extends string>(values: Iterable<T>, css: (val: T, ext: UtilExtra) => CSSRuleObject) {
	const set = new Set<string>(values);
	return (val: string, ext: UtilExtra) => set.has(val) ? css(val as T, ext) : NOTHING;
}

export interface PluginOptions extends Config {
	/** The config file to load, relative to the working directory. `false` turns the search for one off. */
	config?: string | false;
}

/** The plugin factory. Tailwind calls it itself for `@plugin "@windi-ui/tailwind"`, with the options of the `@plugin` block. */
export interface WindUIPlugin<P> {
	(options?: PluginOptions): P;
	__isOptionsFunction: true;
}

/** What Tailwind 4 takes as a plugin. Its own types are not used: this package is built against Tailwind 3's. */
export interface TailwindV4Plugin {
	handler: (api: any) => void;
	config?: any;
}

const OPTIONS = ['prefix', 'variantScope', 'darkSelector', 'build', 'config'];

/** Inline options over those of the config file. An `@plugin` block writes the names in kebab-case. */
function resolveOptions(options: PluginOptions = {}): Config {
	const inline: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(options) as [string, unknown][]) {
		const key = name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
		if (!OPTIONS.includes(key)) {
			throw new Error(`WindUI: unknown option "${name}". The options are: ${OPTIONS.join(', ')}.`);
		}

		if (value !== undefined) inline[key] = value;
	}

	const { config: file, ...config } = inline as PluginOptions;
	// A `build` function can only come from a module, and that module is then the config file.
	if (file === false || (file == null && config.build) || isLoadingConfig()) return config;

	return { ...loadWindUIConfig({ config: file }).config, ...config };
}

/** @param ver the Tailwind major to build for; left out, it is taken from the Tailwind that runs the plugin. */
export function createWindUIPlugin<P = ReturnType<typeof createPlugin>>(ver?: 3 | 4): WindUIPlugin<P> {
	return Object.assign((options?: PluginOptions) => WindUITailwindCSS(resolveOptions(options), ver) as P, {
		__isOptionsFunction: true as const
	});
}

function WindUITailwindCSS(config: Config, ver?: 3 | 4): ReturnType<typeof createPlugin> {
	const wiu = create(config);

	return Object.assign(createPlugin((tw) => {
		const tp = createTailwindTheme(tw, ver);
		const gt = wiu.generator(tp);

		// Tailwind 4 has no `darkMode` unless a JS config sets one. From 4.1.17 it expands `@variant dark` in plugin CSS.
		const darkMode = wiu.config.darkSelector != null
			? toDarkMode(wiu.config.darkSelector)
			: tw.config<DarkModeConfig | undefined>('darkMode');
		const darkSelector = darkMode != null ? getDarkSelector(darkMode)
			: tp.ver === 4 && tailwindAtLeast(4, 1, 17) ? VARIANT_DARK : getDarkSelector('media');

		tw.addBase({ ':root': gt.colors.rootVars() });
		tw.addBase({ ':root': gt.sizes.rootVars() });

		const scope = wiu.config.variantScope;
		if (scope === 'universal') {
			tw.addBase({ '*': applyDark(darkSelector, gt.variants.rootVars()) });
		} else {
			const mode = gt.variants.modeVars();
			tw.addBase({ ':root': mode.light });
			tw.addBase({ '*': applyDark(darkSelector, { '@dark': mode.dark }) });

			const reset = gt.variants.resetVars();
			if (scope === 'element') {
				tw.addBase({ ':where([class*="v-"]) > *': reset });
			}

			// For an element that gets its variant without a `v-*` class of its own, such as `.card { @apply v-solid }`
			tw.addUtilities({ '.v-scope': { ':where(&) > *': reset } });
		}

		const colorNames = gt.colors.names();
		const variantNames = gt.variants.names();
		const sizeNames = gt.sizes.names();

		tw.matchUtilities({
			c: known(colorNames, (val) => gt.colors.cssVars(val))
		}, { values: keyValuePairs(colorNames) });

		tw.matchUtilities({
			v: known(variantNames, (val) => applyDark(darkSelector, gt.variants.cssVars(val))),
		}, { values: keyValuePairs(variantNames) });

		const variantUtil = (prop: ApplyVariantMainProp) => known<ApplyVariantSubProp>(
			Object.values(VARIANT_UTILS),
			(val, ext) => gt.variants.utilCss(prop, val, ext.modifier ?? undefined) as Record<string, string>
		);

		tw.matchUtilities({
			bg: variantUtil('bg'),
			border: variantUtil('border'),
			text: variantUtil('text'),
		}, {
			values: VARIANT_UTILS,
			modifiers: tw.theme('opacity'),
			// Tailwind 3 drops `bg-[#123456]` as ambiguous before the callback runs unless the type is narrowed.
			...(tp.ver === 3 ? { type: ['lookup'] } : {})
		});

		tw.matchUtilities({
			s: known(sizeNames, (val) => gt.sizes.cssVars(val))
		}, {
			values: keyValuePairs(sizeNames)
		});

		// @ts-ignore
		tw.addComponents([...gt.components.css()]);
	}, {
		content: [],
		theme: {
			extend: {
				colors(utils) {
					const { colors } = utils;
					// The theme is resolved before the plugin runs, so the plugin API cannot tell the version here.
					// The Tailwind that resolves the config can: only Tailwind 3 passes `breakpoints` and `negative`.
					const isV3 = ver ? ver === 3 : 'breakpoints' in utils;

					return {
						c: keyValuePairs(Object.keys(colors.gray), v => {
							const c = wiu.vars.color(v as ColorShade);
							return isV3 ? `rgb(${c} / <alpha-value>)` : c;
						}),
						// TODO: add as configurable option
						default: colors.gray,
						accent: colors.blue,
					};
				},
			}
		}
	}), { [CONFIG]: config });
}
