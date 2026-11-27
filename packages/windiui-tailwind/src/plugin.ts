import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import type createPluginType from 'tailwindcss/plugin';
import type { CSSRuleObject, DarkModeConfig } from 'tailwindcss/types/config';
import { create, FALLBACK_PALETTES as FALLBACK, manifestTypes, type Builder, type Config, type ColorShade, type ColorValue, type ApplyVariantMainProp, type ApplyVariantSubProp } from "@windi-ui/core";
import { resolvePalette, type Palette, type Palettes } from '@windi-ui/core/theme';
import { loadWindiUIConfig } from './config';
import { CONFIG, isLoadingConfig } from './utils/configState';
import { classSource } from './safelist';
import type { RecursiveRecord } from './types';
import { createTailwindTheme, flattenColorPalette } from './theme';
import { getDarkSelector, applyDark, rootDarkSelector, toDarkMode, universalDarkSelector, VARIANT_DARK } from './utils/darkMode';
import { calledByTailwind, tailwindAtLeast } from './utils/version';

// Tailwind 3 has no `exports` map, so Node's ESM resolver cannot find `tailwindcss/plugin` (no extension); `require` can,
// on both majors.
const createPlugin = createRequire(import.meta.url)('tailwindcss/plugin') as typeof createPluginType;

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

// `c-[--brand]` arrives as `--brand` on Tailwind 4 and as `var(--brand)` on Tailwind 3, like `c-(--brand)` on 4.
const ARBITRARY_VARS = /^(?:var\((--[\w-]+)\)|(--[\w-]+))$/;

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
export interface WindiUIPlugin<P> {
	(options?: PluginOptions): P;
	__isOptionsFunction: true;
}

/** What Tailwind 4 takes as a plugin. Its own types are not used: this package is built against Tailwind 3's. */
export interface TailwindV4Plugin {
	handler: (api: any) => void;
	config?: any;
}

// shortcut: `colorsDefault` and `colorsAccent` exist only because an `@plugin` block cannot write an object; remove them
// for `colors.default` and `colors.accent` once Tailwind passes nested options to a plugin.
const OPTIONS = ['prefix', 'componentPrefix', 'rootSelector', 'colors', 'colorsDefault', 'colorsAccent', 'variantScope', 'overrides', 'overrideMode', 'states', 'variantUtilities', 'darkSelector', 'presets', 'build', 'safelist', 'manifest', 'debug', 'config'];

/**
 * Inline options over those of the config file. An `@plugin` block writes the names in kebab-case.
 * @param strict whether an unknown option is an error. In a JavaScript call it was ignored in 0.7, and still only warns.
 */
function resolveOptions(options: PluginOptions = {}, strict = false): Config {
	const inline: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(options) as [string, unknown][]) {
		const key = name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
		// An error, not the warning of an unknown option: a config of 0.8 would otherwise silently get gray and blue
		if (key === 'default' || key === 'accent') {
			throw new Error(`WindiUI: the top-level \`${key}\` option moved to \`colors.${key}\` in 0.8.2 and was removed in 0.9. An \`@plugin\` block writes it \`colors-${key}\`.`);
		}
		if (!OPTIONS.includes(key)) {
			const message = `WindiUI: unknown option "${name}". The options are: ${OPTIONS.join(', ')}.`;
			if (strict) throw new Error(message);

			console.warn(message);
			continue;
		}

		if (key === 'build' && value != null && typeof value !== 'function') {
			throw new Error('WindiUI: `build` is a function, which an `@plugin` block cannot hold. Put it in a config file or a plugin module.');
		}
		if ((key === 'overrides' || key === 'states' || key === 'variantUtilities' || key === 'manifest') && value != null && (typeof value !== 'object' || Array.isArray(value))) {
			throw new Error(`WindiUI: \`${key}\` is an object, which an \`@plugin\` block cannot hold. Put it in a config file or a plugin module.`);
		}

		// Tailwind splits an unquoted `root-selector: :root, .scope` of an `@plugin` block at the comma.
		if (value !== undefined) inline[key] = key === 'rootSelector' && Array.isArray(value) ? value.join(', ') : value;
		// `presets: nuxt-ui` is a string, and `presets: nuxt-ui, other` a list.
		if (key === 'presets' && typeof value === 'string') inline[key] = [value];
		// `colors: primary, error` is `colors.only`, which a block cannot write as an object.
		if (key === 'colors' && (typeof value === 'string' || Array.isArray(value))) inline[key] = { only: [value].flat() };
	}

	const { config: file, colorsDefault, colorsAccent, ...config } = inline as PluginOptions & Partial<Record<'colorsDefault' | 'colorsAccent', ColorValue>>;
	// The `@plugin` block's aliases, see `OPTIONS`
	if (colorsDefault != null) config.colors = { ...config.colors, default: colorsDefault };
	if (colorsAccent != null) config.colors = { ...config.colors, accent: colorsAccent };
	// A call with `build` is written in code, a plugin module or a Tailwind config, and is taken as the whole config.
	if (file === false || (file == null && config.build) || isLoadingConfig()) return config;

	const loaded = loadWindiUIConfig({ config: file }).config;
	return { ...loaded, ...config, colors: { ...loaded.colors, ...config.colors } };
}

/**
 * The palettes the presets and `build` add with `utilities: true`. Tailwind resolves its theme before the builder can
 * run, so they are first run on a builder that does nothing but note them.
 */
function utilityColors({ presets, build }: ReturnType<typeof create>['config'], inTheme: (name: string) => boolean) {
	const found = new Map<string, ColorValue>();
	const removed = new Set<string>();
	const set: Builder['setColor'] = (name, value, options) => {
		if (options?.utilities) found.set(name, value);
		else found.delete(name);
		return builder;
	};

	const noted: Partial<Builder> = {
		// As on the real builder, which skips a name that exists: the color of the theme stays as it is.
		addColor: (name, ...rest) => inTheme(name) && !removed.has(name) && !found.has(name) ? builder : set(name, ...rest),
		setColor: set,
		removeColor: name => (found.delete(name), removed.add(name), builder),
	};
	const builder: Builder = new Proxy(noted as Builder, {
		get: (target, key: keyof Builder) => target[key] ?? (() => key.endsWith('Names') ? [] : builder)
	});

	try {
		for (const preset of presets) preset.build(builder);
		build?.(builder);
	} catch {
		// The run on the real builder is the one that reports it.
	}

	return found;
}

/** Writes `content` to `file`, relative to the working directory, unless it already holds it: a watcher sees no change. */
function writeIfChanged(file: string, content: string) {
	const path = resolve(file);
	try {
		if (readFileSync(path, 'utf8') === content) return;
	} catch {
		// Not there yet
	}

	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
}

/** @param ver the Tailwind major to build for; left out, it is taken from the Tailwind that runs the plugin. */
export function createWindiUIPlugin<P = ReturnType<typeof createPlugin>>(ver?: 3 | 4): WindiUIPlugin<P> {
	return Object.assign((options?: PluginOptions) => WindiUITailwindCSS(resolveOptions(options, calledByTailwind(1)), ver) as P, {
		__isOptionsFunction: true as const
	});
}

function WindiUITailwindCSS(config: Config, ver?: 3 | 4): ReturnType<typeof createPlugin> {
	const wiu = create(config);

	// The theme colors `default` and `accent` as the theme callback below gave them, when an option names the palette.
	let followed: Partial<Record<'default' | 'accent', Record<string, string>>> = {};
	// The shades a `default` or `accent` palette of the theme lacks, when it has some. Tailwind merges those into the
	// fallback shade by shade, so the merged theme cannot tell.
	let missing: Partial<Record<'default' | 'accent', string[]>> = {};
	let probing = false;
	let mixReported = false;

	let utilities: Map<string, ColorValue> | undefined;
	// The palette of each spec in `utilities`: Tailwind resolves its theme many times, and a fit takes milliseconds
	const resolved = new Map<string, Palette>();
	let utilitiesReported = false;
	let safelistReported = false;
	let manifestReported = false;

	return Object.assign(createPlugin((tw) => {
		const tp = createTailwindTheme(tw, ver, utilities && [...utilities.keys()]);
		const gt = wiu.generator(tp);

		for (const [name, shades] of Object.entries(mixReported ? {} : missing) as ['default' | 'accent', string[]][]) {
			mixReported = true;
			console.warn(`WindiUI: the theme's "${name}" palette has no shade ${shades.join(', ')}; ${shades.length > 1 ? 'these are' : 'it is'} taken from ${FALLBACK[name]}. Give it all 11 shades, or set \`colors.${name}\`.`);
		}

		// Tailwind puts a palette of the app's own theme over the one a plugin gives, so the option cannot replace it.
		for (const [name, palette] of Object.entries(mixReported ? {} : followed)) {
			const theme = tw.theme<Record<string, string>>(`colors.${name}`, {});
			if (Object.keys(palette).some(s => theme[s] !== palette[s])) {
				mixReported = true;
				console.warn(`WindiUI: the theme has a "${name}" palette of its own, which utilities such as \`bg-${name}-500\` keep using. \`colors.${name}\` only sets \`c-${name}\` and the variables. Use one of the two.`);
			}
		}

		// Tailwind 4 has no `darkMode` unless a JS config sets one. From 4.1.17 it expands `@variant dark` in plugin CSS.
		const darkMode = wiu.config.darkSelector != null
			? toDarkMode(wiu.config.darkSelector)
			: tw.config<DarkModeConfig | undefined>('darkMode');
		const darkSelector = darkMode != null ? getDarkSelector(darkMode)
			: tp.ver === 4 && tailwindAtLeast(4, 1, 17) ? VARIANT_DARK : getDarkSelector('media');

		const root = wiu.config.rootSelector;
		tw.addBase({ [root]: applyDark(rootDarkSelector(darkSelector), gt.colors.rootVars()) });
		tw.addBase({ [root]: gt.sizes.rootVars() });

		const scope = wiu.config.variantScope;
		if (scope === 'universal') {
			tw.addBase({ '*': applyDark(universalDarkSelector(darkSelector), gt.variants.rootVars()) });
		} else {
			const mode = gt.variants.modeVars();
			// Without specificity, so that the dark rule below also wins on the root element itself.
			tw.addBase({ ':where(:root)': mode.light });
			tw.addBase({ '*': applyDark(universalDarkSelector(darkSelector), { '@dark': mode.dark }) });

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

		if (tp.ver === 3) {
			// Tailwind 3 drops a base rule whose selector has a class that no content uses, and the class of dark mode is
			// often only set by a script. That would leave the default variant light.
			const list = tw.config<unknown[]>('safelist');
			for (const [, name] of darkSelector.flat().join(' ').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
				if (!list.includes(name)) list.push(name);
			}
		}

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
			console.warn(`WindiUI: \`safelist\` only works on Tailwind 3. On Tailwind 4, add this line to the stylesheet (\`safelistSource()\` from "@windi-ui/tailwind" returns the string, to keep it current with a test):\n@source inline("${classSource({ c: colorNames, v: variantNames, s: sizeNames })}");`);
		}

		const files = wiu.config.manifest;
		if (files) {
			const manifest = gt.manifest();
			try {
				if (files.json != null) writeIfChanged(files.json, `${JSON.stringify(manifest, null, 2)}\n`);
				if (files.dts != null) writeIfChanged(files.dts, manifestTypes(manifest));
			} catch (e) {
				// The manifest is a side output: the CSS is still built.
				if (!manifestReported) console.error(`WindiUI: cannot write the manifest: ${(e as Error).message}`);
				manifestReported = true;
			}
		}

		const namedColor = known(colorNames, (val) => applyDark(darkSelector, gt.colors.cssVars(val)));
		const varsPalette = (accent: boolean) => (val: string) => {
			const vars = ARBITRARY_VARS.exec(val);
			return vars ? applyDark(darkSelector, gt.colors.varsCssVars(vars[1] ?? vars[2], accent)) : NOTHING;
		};

		tw.matchUtilities({
			c: (val, ext) => ARBITRARY_VARS.test(val) ? varsPalette(false)(val) : namedColor(val, ext)
		}, { values: keyValuePairs(colorNames) });

		// Tailwind reads `c-accent-[--brand]` as the root `c-accent` with an arbitrary value; named values stay `c`'s.
		tw.matchUtilities({ 'c-accent': varsPalette(true) }, { values: {} });

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
			// `apply-v` with no value, or the props and states of `apply-v-[bg,text,focus-visible]`
			'apply-v': (val) => (gt.variants.applyCss(val) as CSSRuleObject | undefined) ?? NOTHING,
		}, { values: { DEFAULT: '' } });

		const variantUtils = Object.entries(wiu.config.variantUtilities ?? {}).filter(([prop, variant]) => {
			// A JSON or JavaScript config is not type-checked
			if (!['bg', 'border', 'text'].includes(prop)) {
				console.error(`WindiUI: \`variantUtilities\` takes bg, border and text, not "${prop}".`);
				return false;
			}
			if (!variantNames.includes(variant)) console.error(`WindiUI: \`variantUtilities\` names the variant "${variant}", which does not exist.`);
			return variantNames.includes(variant);
		}) as [ApplyVariantMainProp, string][];

		if (variantUtils.length) {
			// A color of Tailwind's own with a single value, such as `white` or a palette's `DEFAULT`, keeps its utilities
			const theme = tp.colors();
			const named = colorNames.filter(c => !(c.startsWith('accent-') && colorNames.includes(c.slice(7))) && !(c in theme));

			tw.matchUtilities(Object.fromEntries(variantUtils.map(([prop, variant]) => [
				prop,
				known(named, (color, ext) => applyDark(darkSelector, gt.colors.variantUtilCss(color, prop, variant, ext.modifier ?? undefined) as RecursiveRecord) as CSSRuleObject)
			])), {
				values: keyValuePairs(named),
				modifiers: tw.theme('opacity'),
				// Named values only: an arbitrary `text-[red]` names a color too, and stays Tailwind's.
				type: ['lookup'],
			});
		}

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

					// A color of the theme that follows WindiUI's variables.
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

					missing = {};
					for (const name of ['default', 'accent'] as const) {
						const shades = Object.keys(fallback[name]).filter(s => !theme.includes(`${name}-${s}`));
						if (wiu.config.colors[name] == null && shades.length && shades.length < 11) missing[name] = shades;
					}

					utilities ??= utilityColors(wiu.config, inTheme);
					const own: Record<string, unknown> = {};
					for (const [name, value] of utilities) {
						if (typeof value !== 'string') {
							try {
								own[name] = 'vars' in value
									? keyValuePairs(Object.keys(colors.gray), s => isV3 ? `rgb(var(${value.vars}-${s}) / <alpha-value>)` : `var(${value.vars}-${s})`)
									// A palette spec, resolved over Tailwind's own palettes
									: '50' in value ? value : resolved.get(name) ?? resolved.set(name, resolvePalette(value, { palettes: colors as unknown as Palettes })).get(name);
							} catch (e) {
								if (!utilitiesReported) {
									utilitiesReported = true;
									console.error(`WindiUI: "${name}" gets no color utilities: ${(e as Error).message.replace(/^WindiUI: /, '')}`);
								}
							}
						} else if (value in colors) {
							own[name] = colors[value as keyof typeof colors];
						} else if (!utilitiesReported) {
							utilitiesReported = true;
							console.error(`WindiUI: "${value}" is not one of Tailwind's own palettes, so "${name}" gets no color utilities.`);
						}
					}

					// With an option the theme color follows the root variables, which hold the palette the option gives.
					followed = {
						...(wiu.config.colors.default != null ? { default: follow('default-') } : {}),
						...(wiu.config.colors.accent != null ? { accent: follow('accent-') } : {}),
					};

					return { ...own, c: follow(''), ...fallback, ...followed };
				},
			}
		}
	}), { [CONFIG]: config });
}
