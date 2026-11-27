# Options

`@windi-ui/tailwind` default-exports a function that takes the options and returns a Tailwind plugin. The
same options can be given in three places:

::: code-group

```ts [JavaScript]
import windiui from '@windi-ui/tailwind';

windiui({
	prefix: 'wui',
	rootSelector: ':root',
	colors: { default: 'slate', accent: 'indigo' },
	variantScope: 'element',
	darkSelector: '.dark',
	build(builder) {
		// ...
	}
});
```

```css [@plugin block (Tailwind v4)]
@plugin "@windi-ui/tailwind" {
	prefix: wui;
	default: slate;
	accent: indigo;
	variant-scope: element;
	dark-selector: .dark;
}
```

```ts [windiui.config.ts]
import { defineConfig } from '@windi-ui/tailwind';

export default defineConfig({
	prefix: 'wui',
	variantScope: 'element',
	darkSelector: '.dark',
	build(builder) {
		// ...
	}
});
```

:::

- An `@plugin` block takes the options that are plain values, with their names in kebab-case. `build` is a
  function, so it needs JavaScript: a [config file or a plugin module](/reference/config-file).
- Options given inline, in JavaScript or in the block, override those of a config file.
- An option name WindiUI does not know is an error in an `@plugin` block. In JavaScript it logs a warning and is
  ignored.

All options are optional. The type is exported from `@windi-ui/core` as `Config`.

| Option | Default | In an `@plugin` block | What it does |
| --- | --- | --- | --- |
| [`prefix`](#prefix) | `'wui'` | `prefix: app;` | Prefix of the CSS variables |
| [`rootSelector`](#rootselector) | `':root'` | `root-selector: ":root, .scope";` | Where the root color and size variables are declared |
| [`colors.default`, `colors.accent`](#default-and-accent) | the theme's, or `gray`, `blue` | `default: slate;` | The palettes behind `default` and `accent` |
| [`colors`](#colors) | every palette | `colors: primary, error;` | Which palettes get a `c-*` class |
| [`variantScope`](#variantscope) | `'element'` | `variant-scope: inherit;` | Where the `default` variant comes from, and whether a variant reaches the children |
| [`overrides`](#overrides) | none | no | Values of a variant for some colors |
| [`overrideMode`](#overridemode) | `'vars'` | `override-mode: compound;` | How an override reaches the variant |
| [`variantUtilities`](#variantutilities) | none | no | `bg-{color}`, `text-{color}`, `border-{color}` painted from a variant |
| [`darkSelector`](#darkselector) | follows Tailwind | `dark-selector: .dark;` | What the dark values apply under |
| [`presets`](#presets) | `[]` | `presets: nuxt-ui;` | Presets, run before `build` |
| [`build`](#build) | none | no | The builder callback |
| [`safelist`](#safelist) | `false` | no, Tailwind v3 only | Emit every `c-*`, `v-*` and `s-*` class |
| [`debug`](#debug) | `false` | `debug: true;` | Log what is skipped silently |
| [`config`](#config) | search | `config: "./windiui.config.ts";` | The config file to load, or `false` |

## `prefix`

- Type: `string`
- Default: `'wui'`

The prefix of every CSS variable WindiUI writes and reads: `--<prefix>-c-*`, `--<prefix>-v-*` and
`--<prefix>-s-*`. It does not change class names; `c-*`, `v-*`, `s-*`, `btn` and `badge` stay the same.

```ts
windiui({ prefix: 'app' }); // --app-c-500, --app-v-bg, --app-s-text
```

## `rootSelector`

- Type: `string`
- Default: `':root'`

Where the root color and size variables are declared: `--wui-c-*`, `--wui-c-default-*`, `--wui-c-accent-*`,
black and white, and the default size.

```ts
windiui({ rootSelector: ':root, [data-theme-scope]' });
```

```css
@plugin "@windi-ui/tailwind" {
	root-selector: ":root, [data-theme-scope]";
}
```

A custom property that refers to another one is resolved where it is declared. With a
[`default` or `accent`](#default-and-accent) palette backed by CSS variables, `:root` resolves them once, and
a container that sets those variables again would keep the root's colors. Add the container's selector and
the variables are declared, and resolved, there as well. See
[Palettes that change at runtime](/guide/colors#palettes-that-change-at-runtime).

The light and dark switches of [`variantScope`](#variantscope) stay on `:root`: they follow the dark
selector, not a theme scope.

## `default` and `accent`

- Set as: `colors.default` and `colors.accent`; `default: slate;` and `accent: indigo;` in an `@plugin` block
- Type: `string | { vars: string, overrideVars?: OverrideVars } | Record<shade, string>`
- Default: none; a complete `default` or `accent` palette of the Tailwind theme, or else `gray` and `blue`

The palettes behind the names [`default` and `accent`](/guide/colors#default-and-accent).

| Value | Meaning |
| --- | --- |
| `'slate'` | The palette of that name in the Tailwind theme. In an `@plugin` block this is the only form. |
| `{ vars: '--brand' }` | The 11 shades are `var(--brand-50)` to `var(--brand-950)`. You define those variables. |
| `{ vars: '--brand', overrideVars: {} }` | The same, and the root also takes the palette's [variant overrides](/guide/colors#variant-overrides-at-runtime) from variables. |
| `{ 50: '#f8fafc', ..., 950: '#020617' }` | The 11 shades themselves. |

```ts
windiui({ colors: { default: 'slate', accent: { vars: '--brand' } } });
```

The order is:

1. The option.
2. A palette named `default` or `accent` in the Tailwind theme (`--color-default-*` in `@theme` on v4,
   `theme.extend.colors.default` in a JavaScript config).
3. `gray` and `blue`.

Things to know:

- A name that is not a palette of the theme, or a shade list without all 11 shades, is an error.
- With an option, the theme colors `default` and `accent` are references to `--wui-c-default-*` and
  `--wui-c-accent-*`, so `bg-default-500` follows the option, also when the variables change at runtime.
- A theme palette (step 2) is merged into `gray` or `blue` by Tailwind, shade by shade. When only some shades
  are set, WindiUI logs a warning once that names the others; the output is then the mix, as in 0.7.
- With an option **and** a theme palette of the same name (`--color-default-*` in `@theme`, or
  `theme.extend.colors.default` in a JavaScript config, on Tailwind v3 and v4), the option sets `c-default` and
  the `--wui-c-default-*` variables, but `bg-default-*` and the other theme utilities keep the theme's palette:
  Tailwind puts the app's own theme over a plugin's. WindiUI logs a warning once. Use one of the two.
- A complete theme palette may share shades with `gray` or `blue`; only a shade that is not set counts as
  missing.
- On Tailwind v3 the variables behind `{ vars }` must hold RGB channels (`59 130 246`), as WindiUI's own do.
- The top-level `default` and `accent` options of 0.8.0 still work, are deprecated, and are removed in 0.9.
  `colors.default` and `colors.accent` win over them.

The type is exported from `@windi-ui/core` as `ColorValue`.

## `colors`

- Type: `{ default?: ColorValue, accent?: ColorValue, only?: string[] }`
- Default: every palette of the theme

`only` names the palettes of the theme that get a `c-*` and a `c-accent-*` class. The others get none, so
they leave autocomplete, the [safelist](#safelist) and the [`variantUtilities`](#variantutilities):

```ts
windiui({ colors: { only: ['primary', 'secondary', 'success', 'warning', 'error', 'default'] } });
```

```css
@plugin "@windi-ui/tailwind" {
	colors: primary, secondary, success, warning, error, default;
}
```

- Colors added with [`addColor` or `setColor`](/reference/builder#colors) always get their classes.
- `default` and `accent` are names like the others: `c-default` and `c-accent` exist when they are listed. Their
  root variables, `--wui-c-default-*` and `--wui-c-accent-*` on `:root`, and the theme colors `default` and
  `accent` do not depend on the list.
- The palettes stay in the theme: Tailwind's `bg-red-500` and [`colors.default` and `colors.accent`](#default-and-accent)
  can still name any of them.
- [Overrides](#overrides) of a color without a class are left out, except those of `default` and `accent`, which
  `:root` applies.
- A name that is not a palette, of the theme or of the builder, logs a warning once.
- In an `@plugin` block, `colors:` takes the list itself, and `default:` and `accent:` are written next to it.
- Left out, every palette gets its classes, as before.

The type is exported from `@windi-ui/core` as `ColorsConfig`.

## `variantScope`

- Type: `'element' | 'inherit' | 'universal'`
- Default: `'element'`

Where the `default` variant comes from for an element without a `v-*` class of its own, and whether a variant
reaches the descendants of the element it is set on.

| Value | Behaviour | What is emitted |
| --- | --- | --- |
| `'element'` | An element without `v-*` paints the `default` variant in its own color. A variant stays on its element. | A `var()` fallback wherever a variant variable is read, two light/dark switches, and one base rule that resets the variant variables on the children of an element with `v-` in its class. |
| `'inherit'` | A `v-*` class sets the variant for its element and everything inside it, until the next `v-*` or `v-scope`. | The fallbacks and the switches only. |
| `'universal'` | The same as `'element'`. | The 0.7 output: a `*` rule that sets the `default` variant's variables on every element of the page, and no fallbacks. |

```html
<div class="c-blue v-solid bg-v text-v">
	solid
	<span class="bg-v text-v">default with 'element' and 'universal', solid with 'inherit'</span>
</div>
```

With `'element'` and `'inherit'` a variant utility looks like this (Tailwind v4, `darkMode: 'selector'`):

```css
.bg-v {
	background-color: color-mix(
		in oklab,
		var(--wui-v-bg, var(--wui-v-on-light, var(--wui-c-white)) var(--wui-v-on-dark, var(--wui-c-950)))
		calc(var(--wui-v-bg-opacity, 1) * 100%),
		transparent
	);
}

:where(:root) {
	--wui-v-on-dark: var(--wui-v-nil,);
}

*:where(.dark, .dark *) {
	--wui-v-on-light: var(--wui-v-nil,);
	--wui-v-on-dark: initial;
}
```

The fallback of `--wui-v-bg` is the `default` variant's value: `var(--wui-c-white)` in light mode and
`var(--wui-c-950)` in dark mode. `--wui-v-on-light` and `--wui-v-on-dark` pick between the two: the one of the
current mode is not set, so its fallback is used, and the other one is empty. They are inherited, so the dark
value also reaches pseudo-elements, and a value that is the same in both modes has no switch.

`'element'` adds:

```css
:where([class*="v-"]) > * {
	--wui-v-bg: initial;
	/* ... every variant variable */
}
```

The rule has no specificity, so a child with its own `v-*` class keeps it. It does not match pseudo-elements:
`before:bg-v` and `placeholder:text-v` use the variant of their element in every mode.

Things to know about `'element'` and `'inherit'`:

- **`v-scope`.** An element that gets its variant without a `v-*` class, such as `.card { @apply v-solid }`, is
  not matched by the reset rule. Add `v-scope` to it (`@apply v-solid v-scope`) to reset its children. With
  `'inherit'`, `v-scope` is how you stop a variant at an element. It is not registered with `'universal'`.
- **Direct reads.** `var(--wui-v-bg)` in your own CSS is only valid on an element with a variant. See
  [Using them in your own CSS](/reference/css-variables#using-them-in-your-own-css). Components added with the
  builder get the fallback automatically.
- **Opacity modifiers.** With `'element'`, `bg-v/50` resets its opacity variable on the children of its
  element, so they paint at their own opacity. With `'inherit'` the modifier is inherited like the rest of the
  variant.
- **Other classes with `v-`.** The reset rule also matches classes such as `nav-item`. The only effect is that
  their children get the same reset.

## `overrides`

- Type: `Record<string, Record<string, VariantOverride>>`
- Default: none

Values of a variant for some colors, by variant name and then by color name. A color key may name several
colors, separated by commas.

```ts
windiui({
	overrides: {
		solid: {
			yellow: { bg: '700', pseudos: { ':hover': { bg: '800' } }, dark: { bg: '600' } },
			'amber,lime': { bg: '700' },
		},
	},
});
```

It does the same as [`overrideVariant`](/reference/builder#overrides) in `build`, as data, and is applied
after `build`. See [Override a variant for some colors](/guide/customizing#override-a-variant-for-some-colors).
The type is exported from `@windi-ui/core` as `VariantOverride`.

An override of a value the variant does not define, such as `fg-muted` for a variant without it, makes the
variant set that value itself, for every color: the override for its colors, and the `default` variant's
value for the others. With `variantScope: 'inherit'` those other colors then stop inheriting it from an
enclosing variant. The same goes for [`overrideVars`](/guide/colors#variant-overrides-at-runtime) with such
values in `props`. A color key that is not a palette logs a warning.

## `overrideMode`

- Type: `'vars' | 'compound' | 'both'`
- Default: `'vars'`

How a per-color override reaches the variant.

| Value | What is emitted | Works with |
| --- | --- | --- |
| `'vars'` | The `c-*` class sets override variables, `--wui-cv-<variant>-<prop>`, that the `v-*` class reads; every other color class and the root reset them. | Both classes on one element, a `c-*` class on a parent, `@apply`, and Tailwind variants such as `hover:v-solid` or `md:c-yellow`. |
| `'compound'` | A `.c-<color>.v-<variant>` rule, nested in the variant class, with a dark block that repeats the variant's dark values it would hide. | Both classes on one element only. |
| `'both'` | The two. | |

```ts
windiui({
	overrideMode: 'compound',
	overrides: { solid: { yellow: { bg: '700' } } },
});
```

```css
/* 'compound', on Tailwind v4 */
.v-solid {
	--wui-v-bg: var(--wui-c-600);
	&.c-yellow {
		--wui-v-bg: var(--wui-c-700);
	}
}
```

A palette with [`overrideVars`](/guide/colors#variant-overrides-at-runtime) uses override variables in every mode.
In an `@plugin` block it is written `override-mode: compound;`.

The compound rule names the color class without a Tailwind v4 `prefix(...)`, which a plugin cannot read, so it
never matches `tw:c-yellow`. With a v4 prefix use `'vars'`. Tailwind v3 adds its `prefix` to the rule itself.

## `variantUtilities`

- Type: `{ bg?: string, text?: string, border?: string }`
- Default: none

Adds `bg-{color}`, `text-{color}` and `border-{color}` for every palette, painted with the value of the named
variant for that color: its background, text or border color, with its opacity.

```ts
windiui({ variantUtilities: { bg: 'solid', text: 'outline', border: 'outline' } });
```

```css
/* the solid background of yellow: shade 600, or 700 with an override */
.bg-yellow { background-color: <yellow-700>; }
/* a palette given by variables with `overrideVars` */
.bg-primary { background-color: var(--ui-color-primary-solid-bg, var(--ui-color-primary-600)); }
```

- The shades are those of the named color, not of the element's `c-*` class.
- [Overrides](#overrides) of that color and the variant's dark values apply, as on `c-<color> v-<variant>`.
- An opacity modifier replaces the variant's opacity: `bg-yellow/50`.
- Tailwind's own utilities win. A color of the theme with a single value, such as `white` or a palette with a
  `DEFAULT`, gets no utility from WindiUI, and arbitrary values such as `bg-[#123456]` stay Tailwind's.
- A variant that does not exist is reported, and its utility is left out.

The option is an object, so on Tailwind v4 it needs a [config file or a plugin module](/reference/config-file),
not an `@plugin` block. See [Color utilities from a variant](/guide/utilities#color-utilities-from-a-variant).

## `darkSelector`

- Type: `'media' | 'class' | 'selector' | ['class' | 'selector', string] | ['variant', string | string[]] | string`
- Default: none; dark mode follows Tailwind

What the dark values of the variants apply under. It takes every form of Tailwind's `darkMode`, and a bare
selector, which is the `selector` strategy with that selector:

```ts
windiui({ darkSelector: '.dark' });                  // &:where(.dark, .dark *)
windiui({ darkSelector: 'media' });                  // @media (prefers-color-scheme: dark)
windiui({ darkSelector: ['variant', '&:where([data-theme=dark], [data-theme=dark] *)'] });
```

```css
@plugin "@windi-ui/tailwind" {
	dark-selector: .dark;
}
```

Left out, WindiUI uses the `darkMode` of the Tailwind config when there is one, then Tailwind v4's own dark
variant (`@custom-variant dark` included), then the media query. See
[Dark mode](/guide/dark-mode#how-the-dark-selector-is-chosen) for the order and the table of forms. The type
is exported from `@windi-ui/core` as `DarkSelectorOption`.

## `presets`

- Type: `(Preset | 'nuxt-ui')[]`
- Default: `[]`

Sets of variants, sizes, components, colors and overrides, run in order before [`build`](#build). A preset is
given by name, with its default options, or as the object a preset function returns:

```ts
import { nuxtUi } from '@windi-ui/tailwind/presets';

windiui({ presets: ['nuxt-ui'] });
windiui({ presets: [nuxtUi({ prefix: 'nui', only: ['soft', 'ghost'] })] });
```

```css
@plugin "@windi-ui/tailwind" {
	presets: nuxt-ui;
}
```

Every preset takes `override`, `prefix` and `only`. A config file in JSON takes the names. An unknown name is
an error. See [Presets](/guide/presets). The types are exported from `@windi-ui/core` as `Preset`,
`PresetOptions` and `PresetName`.

## `build`

- Type: `(builder: Builder) => void`
- Default: none

Called after the built-in variants, sizes and components are registered, and after the [presets](#presets), and
before CSS is generated. Use the [builder](/reference/builder) to add, replace, update or remove them. It runs twice
per compilation, see [Builder](/reference/builder#colors), so keep other work out of it. See
[Customizing](/guide/customizing) for a walkthrough.

```ts
windiui({
	build: (builder) => builder
		.setColor('primary', 'indigo')
		.updateVariant('light', (light) => {
			light['bg-opacity'] = '0.30';
		})
		.removeComponent('badge'),
});
```

## `safelist`

- Type: `boolean`
- Default: `false`
- Tailwind v3 only

Tailwind emits the classes it finds in your source. A class that is built at runtime, such as `c-${color}`
from a component prop, is not found, and has to be safelisted.

### Tailwind v3

`safelist: true` emits every `c-*`, `v-*` and `s-*` class, used or not: one per palette and accent palette,
variant and size, including those of the builder. It adds a pattern to the `safelist` of the Tailwind config,
next to your own entries, and follows Tailwind's `prefix`.

```js
windiui({ safelist: true });
```

That is about 60 small rules with Tailwind's default theme. To list fewer, limit the colors with
[`colors.only`](#colors), or leave the option off and write the classes you need in the `safelist` of the
Tailwind config.

### Tailwind v4

A plugin cannot safelist on Tailwind v4; the stylesheet does it with `@source inline()`. `safelistSource()`
returns the string to put there:

```ts
import { safelistSource } from '@windi-ui/tailwind';
import config from './windiui.config';

safelistSource(config);
// '{c-{accent,accent-accent,...,zinc},v-{default,light,outline,solid},s-{default,lg,md,sm,xl,xs}}'
safelistSource(config, { axes: ['c', 'v'] });
safelistSource(config, { axes: ['c'], palettes: ['red', 'green'] });
// 'c-{accent,accent-accent,accent-default,accent-green,accent-red,default,green,red}'
```

```css
@source inline("{c-{...},v-{default,light,outline,solid},s-{default,lg,md,sm,xl,xs}}");
```

The line is written by hand. A test keeps it current:

```ts
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { safelistSource } from '@windi-ui/tailwind';
import config from './windiui.config';

it('safelists the WindiUI classes', () => {
	expect(readFileSync('src/main.css', 'utf8')).toContain(`@source inline("${safelistSource(config)}");`);
});
```

| Argument | Description |
| --- | --- |
| `config` | The WindiUI options, or the plugin made from them, which is what a [plugin module](/reference/config-file#plugin-module) exports. Its `build` runs, so colors, variants and sizes of the builder are listed. |
| `options.axes` | Which kinds to list, in that order: `'c'`, `'v'`, `'s'`. All three by default. |
| `options.palettes` | The names of the theme's palettes with all 11 shades. By default the 26 of Tailwind v4's default theme. |

- The names are sorted, so the string only changes when the classes do.
- **`palettes`.** `safelistSource()` runs without Tailwind, so it does not see your theme. With the default
  theme of a current Tailwind v4 it returns exactly the classes the plugin registers. Pass `palettes` when
  your `@theme` adds or removes palettes, when you only need some of them, or on an older Tailwind v4 such as
  4.1, which has no `mauve`, `olive`, `mist` and `taupe`. A class that does not exist is ignored by Tailwind.
  `default`, `accent`, the `accent-*` classes and the colors of `build` are always added; with
  [`colors.only`](#colors), only the listed palettes and the colors of `build` are.
- A `colors.default` or `colors.accent` that names a palette needs that palette in the list.
- `safelist: true` on Tailwind v4 changes nothing. It logs a warning once with the `@source inline()` line
  for the classes that are registered in that build, which you can paste.

## `debug`

- Type: `boolean`
- Default: `false`

Logs what WindiUI otherwise skips silently. Today that is one message per theme palette that does not have all
11 shades and therefore gets no `c-*` class.

```ts
windiui({ debug: true });
```

```css
@plugin "@windi-ui/tailwind" {
	debug: true;
}
```

## `config`

- Type: `string | false`
- Default: none
- Not read from a config file

The [config file](/reference/config-file) to load, relative to the working directory. Without it, a call that
passes no `build` searches for `windiui.config.*` and `package.json#windiui`. `false` turns that search off.

An option name that WindiUI does not know is an error in an `@plugin` block. In a JavaScript call it logs a
warning and is ignored, as it was ignored in 0.7.

```css
@plugin "@windi-ui/tailwind" {
	config: "./config/windiui.config.ts";
}
```

## Entry points

| Import | What it is |
| --- | --- |
| `@windi-ui/tailwind` | The plugin, as the default export. It builds for the Tailwind that runs it. |
| `@windi-ui/tailwind/v4` | The same, always building for Tailwind v4 and typed for v4's `Config`. |
| `@windi-ui/tailwind/v3` | The same, always building for Tailwind v3. |
| `@windi-ui/tailwind/presets` | The [presets](/guide/presets) and `definePreset`, the same as `@windi-ui/core/presets`. |

The `/v3` and `/v4` entries are for a setup where the automatic choice is wrong. All three plugin entries
work with `@plugin` and take the same options.

`@windi-ui/tailwind` also has these named exports, for Node.js:

- `defineConfig`, for a [config file](/reference/config-file#config-file).
- [`loadWindiUIConfig`](/reference/config-file#loadwindiuiconfig).
- [`safelistSource`](#tailwind-v4), and `classSource`, which writes given class names as the same brace
  expression.
- `definePreset` and the presets, such as `nuxtUi`. See [`presets`](#presets).

```ts
import windiui, { defineConfig, safelistSource } from '@windi-ui/tailwind';
```

In CommonJS, `require('@windi-ui/tailwind')` is the plugin, as in 0.7, and carries the helpers as properties:
`const { safelistSource } = require('@windi-ui/tailwind');`. The default import of ESM has no such properties;
import the helpers by name.

The `@windi-ui/tailwind/config` (`defineConfig`, `loadWindiUIConfig`) and `@windi-ui/tailwind/safelist`
(`safelistSource`, `classSource`) entries export the same helpers, without loading the plugin.

## What the plugin reads from Tailwind

These are not WindiUI options, but they shape its output:

| Tailwind setting | Used for |
| --- | --- |
| `theme.colors` | The `c-*` classes: one per palette with all 11 shades. See [Colors](/guide/colors). |
| `theme.spacing`, `theme.fontSize` | The values of the built-in [sizes](/guide/sizes). |
| `theme.opacity` | The modifiers of `bg-v`, `text-v`, `border-v` and the [`variantUtilities`](#variantutilities). |
| `darkMode`, or on v4 the `dark` variant | The selector or media query for dark variant values, unless [`darkSelector`](#darkselector) is set. See [Dark mode](/guide/dark-mode). |

## What the plugin adds to the theme

| Theme color | Value |
| --- | --- |
| `c` (`c-50` to `c-950`) | The current palette, as references to `--wui-c-<shade>` |
| A palette added with [`utilities: true`](/reference/builder#colors) | Its shades, or references to its variables |
| `default` | Tailwind's `gray`, or references to `--wui-c-default-<shade>` when [`colors.default`](#default-and-accent) is set |
| `accent` | Tailwind's `blue`, or references to `--wui-c-accent-<shade>` when `colors.accent` is set |

## What the plugin generates

| Output | Selector |
| --- | --- |
| Default color, default and accent palettes, black and white | `:root`, or [`rootSelector`](#rootselector) |
| Default size | `:root`, or `rootSelector` |
| Reset of the variant variables | `:where([class*="v-"]) > *` (`variantScope: 'element'`) |
| Default variant | `*` (`variantScope: 'universal'` only) |
| One class per palette, or per palette of [`colors.only`](#colors), plus one per accent palette, with the [override variables](/reference/css-variables#override-variables) when there are overrides | `.c-<name>`, `.c-accent-<name>` |
| One class per variant | `.v-<name>` |
| Per-color overrides with [`overrideMode`](#overridemode) `'compound'` or `'both'` | `.v-<name>.c-<color>` |
| One class per size | `.s-<name>` |
| Variant utilities | `.bg-v`, `.text-v`, `.border-v` and their `-soft`, `-muted`, `-accent` levels |
| The variant on an element, with its states | `.apply-v`, `.apply-v-[<props and states>]` |
| Color utilities from a variant, with [`variantUtilities`](#variantutilities) | `.bg-<color>`, `.text-<color>`, `.border-<color>` |
| Variant boundary | `.v-scope` (not with `variantScope: 'universal'`) |
| Components | `.btn`, `.badge` and those you add |

As with any Tailwind utility, classes are only emitted when they are used in your content.
