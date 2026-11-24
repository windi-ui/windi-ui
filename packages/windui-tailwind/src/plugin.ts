import { default as createPlugin } from 'tailwindcss/plugin';
import type { CSSRuleObject, DarkModeConfig } from 'tailwindcss/types/config';
import { create, type Builder, type Config, type ColorShade, type ColorValue, type ApplyVariantMainProp, type ApplyVariantSubProp } from "@windi-ui/core";
import { loadWindUIConfig } from './config';
import { CONFIG, isLoadingConfig } from './utils/configState';
import { classSource } from './safelist';
import { createTailwindTheme } from './theme';
import { getDarkSelector, applyDark, toDarkMode, VARIANT_DARK } from './utils/darkMode';
import { calledByTailwind, tailwindAtLeast } from './utils/version';

function keyValuePairs(
	keys: string[],
	val = (k: string) => k
): Record<string, string> {
	return keys.reduce((acc, k) => {
		acc[k] = val(k);
		return acc;
	}, {} as Record<string, string>);
}

const FALLBACK = { default: 'gray', accent: 'blue' } as const;

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

const OPTIONS = ['prefix', 'rootSelector', 'default', 'accent', 'variantScope', 'darkSelector', 'build', 'safelist', 'debug', 'config'];

/**
 * Inline options over those of the config file. An `@plugin` block writes the names in kebab-case.
 * @param strict whether an unknown option is an error. In a JavaScript call it was ignored in 0.7, and still only warns.
 */
function resolveOptions(options: PluginOptions = {}, strict = false): Config {
	const inline: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(options) as [string, unknown][]) {
		const key = name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
		if (!OPTIONS.includes(key)) {
			const message = `WindUI: unknown option "${name}". The options are: ${OPTIONS.join(', ')}.`;
			if (strict) throw new Error(message);

			console.warn(message);
			continue;
		}

		if (key === 'build' && value != null && typeof value !== 'function') {
			throw new Error('WindUI: `build` is a function, which an `@plugin` block cannot hold. Put it in a config module or a config file.');
		}

		// Tailwind splits an unquoted `root-selector: :root, .scope` of an `@plugin` block at the comma.
		if (value !== undefined) inline[key] = key === 'rootSelector' && Array.isArray(value) ? value.join(', ') : value;
	}

	const { config: file, ...config } = inline as PluginOptions;
	// A `build` function can only come from a module, and that module is then the config file.
	if (file === false || (file == null && config.build) || isLoadingConfig()) return config;

	return { ...loadWindUIConfig({ config: file }).config, ...config };
}

/**
 * The palettes `build` adds with `utilities: true`. Tailwind resolves its theme before the builder can run, so `build`
 * is first run on a builder that does nothing but note them.
 */
function utilityColors(build: Config['build']) {
	const found = new Map<string, ColorValue>();
	const set: Builder['setColor'] = (name, value, options) => {
		if (options?.utilities) found.set(name, value);
		else found.delete(name);
		return builder;
	};

	const noted: Partial<Builder> = { addColor: set, setColor: set, removeColor: name => (found.delete(name), builder) };
	const builder: Builder = new Proxy(noted as Builder, {
		get: (target, key: keyof Builder) => target[key] ?? (() => key.endsWith('Names') ? [] : builder)
	});

	try {
		build?.(builder);
	} catch {
		// The run on the real builder is the one that reports it.
	}

	return found;
}

/** @param ver the Tailwind major to build for; left out, it is taken from the Tailwind that runs the plugin. */
export function createWindUIPlugin<P = ReturnType<typeof createPlugin>>(ver?: 3 | 4): WindUIPlugin<P> {
	return Object.assign((options?: PluginOptions) => WindUITailwindCSS(resolveOptions(options, calledByTailwind(1)), ver) as P, {
		__isOptionsFunction: true as const
	});
}

function WindUITailwindCSS(config: Config, ver?: 3 | 4): ReturnType<typeof createPlugin> {
	const wiu = create(config);

	// The palettes the theme gets when no option names one, as the theme callback below saw them.
	let fallback: Record<'default' | 'accent', Record<string, string>> | undefined;
	let mixReported = false;

	let utilities: Map<string, ColorValue> | undefined;
	let utilitiesReported = false;
	let safelistReported = false;

	return Object.assign(createPlugin((tw) => {
		const tp = createTailwindTheme(tw, ver, utilities && [...utilities.keys()]);
		const gt = wiu.generator(tp);

		// A theme that sets only some shades of `default` or `accent` has them merged into the fallback, shade by shade.
		for (const name of fallback && !mixReported ? ['default', 'accent'] as const : []) {
			if (wiu.config[name] != null) continue;

			const base = fallback![name];
			const palette = tw.theme<Record<string, string>>(`colors.${name}`, {});
			const missing = Object.keys(base).filter(s => palette[s] === base[s]);
			if (missing.length && missing.length < Object.keys(base).length) {
				mixReported = true;
				console.warn(`WindUI: the theme's "${name}" palette has no shade ${missing.join(', ')}; ${missing.length > 1 ? 'these are' : 'it is'} taken from ${FALLBACK[name]}. Give it all 11 shades, or set the \`${name}\` option.`);
			}
		}

		// Tailwind 4 has no `darkMode` unless a JS config sets one. From 4.1.17 it expands `@variant dark` in plugin CSS.
		const darkMode = wiu.config.darkSelector != null
			? toDarkMode(wiu.config.darkSelector)
			: tw.config<DarkModeConfig | undefined>('darkMode');
		const darkSelector = darkMode != null ? getDarkSelector(darkMode)
			: tp.ver === 4 && tailwindAtLeast(4, 1, 17) ? VARIANT_DARK : getDarkSelector('media');

		const root = wiu.config.rootSelector;
		tw.addBase({ [root]: gt.colors.rootVars() });
		tw.addBase({ [root]: gt.sizes.rootVars() });

		const scope = wiu.config.variantScope;
		if (scope === 'universal') {
			tw.addBase({ '*': applyDark(darkSelector, gt.variants.rootVars()) });
		} else {
			const mode = gt.variants.modeVars();
			// Without specificity, so that the dark rule below also wins on the root element itself.
			tw.addBase({ ':where(:root)': mode.light });
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

		if (wiu.config.safelist && tp.ver === 3) {
			// A `safelist` in the plugin's config is dropped when the app has its own, so the pattern goes into the
			// resolved one. Tailwind 3 reads it after the plugins ran, and matches it against the classes they registered.
			const list = tw.config<{ pattern?: RegExp }[]>('safelist');
			const pattern = new RegExp(`^${tw.config('prefix', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[cvs]-`);
			if (!list.some(entry => String(entry?.pattern) === String(pattern))) list.push({ pattern });
		}

		// Tailwind 4 takes no safelist from a plugin; the stylesheet has to name the classes.
		if (wiu.config.safelist && tp.ver === 4 && !safelistReported) {
			safelistReported = true;
			console.warn(`WindUI: \`safelist\` only works on Tailwind 3. On Tailwind 4, add this line to the stylesheet (\`safelistSource()\` from "@windi-ui/tailwind/safelist" returns the string, to keep it current with a test):\n@source inline("${classSource({ c: colorNames, v: variantNames, s: sizeNames })}");`);
		}

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

					// A color of the theme that follows WindUI's variables.
					const follow = (prefix: '' | 'default-' | 'accent-') => keyValuePairs(Object.keys(colors.gray), v => {
						const c = wiu.vars.color(`${prefix}${v as ColorShade}`);
						return isV3 ? `rgb(${c} / <alpha-value>)` : c;
					});

					// Tailwind resolves `colors` again for the `theme()` call below; answered with nothing, that gives the
					// theme as it is without this plugin.
					if (probing) return {};

					let theme: string[] = [];
					probing = true;
					try {
						theme = Object.keys(flattenColorPalette((utils.theme('colors') ?? {}) as RecursiveRecord));
					} catch {
						// Then nothing is known about the theme, and nothing is reported.
					} finally {
						probing = false;
					}

					const inTheme = (name: string) => theme.some(key => key === name || key.startsWith(`${name}-`));
					const fallback = { default: colors[FALLBACK.default], accent: colors[FALLBACK.accent] };

					utilities ??= utilityColors(wiu.config.build);
					const own: Record<string, unknown> = {};
					for (const [name, value] of utilities) {
						if (typeof value !== 'string') {
							own[name] = 'vars' in value
								? keyValuePairs(Object.keys(colors.gray), s => isV3 ? `rgb(var(${value.vars}-${s}) / <alpha-value>)` : `var(${value.vars}-${s})`)
								: value;
						} else if (value in colors) {
							own[name] = colors[value as keyof typeof colors];
						} else if (!utilitiesReported) {
							utilitiesReported = true;
							console.error(`WindUI: "${value}" is not one of Tailwind's own palettes, so "${name}" gets no color utilities.`);
						}
					}

					return {
						...own,
						c: follow(''),
						// With an option the theme color follows the root variables, which hold the palette the option gives.
						default: wiu.config.default != null ? follow('default-') : fallback.default,
						accent: wiu.config.accent != null ? follow('accent-') : fallback.accent,
					};
				},
			}
		}
	}), { [CONFIG]: config });
}
