# Options

`@windi-ui/tailwind` default-exports a function that takes the options and returns a Tailwind plugin. The
same options can be given in three places:

::: code-group

```ts [JavaScript]
import windiui from '@windi-ui/tailwind';

windiui({
	prefix: 'wui',
	rootSelector: ':root',
	default: 'slate',
	accent: 'indigo',
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
- An option name WindiUI does not know is an error.

All options are optional. The type is exported from `@windi-ui/core` as `Config`.

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

- Type: `string | { vars: string } | Record<shade, string>`
- Default: none; a complete `default` or `accent` palette of the Tailwind theme, or else `gray` and `blue`

The palettes behind the names [`default` and `accent`](/guide/colors#default-and-accent).

| Value | Meaning |
| --- | --- |
| `'slate'` | The palette of that name in the Tailwind theme. In an `@plugin` block this is the only form. |
| `{ vars: '--brand' }` | The 11 shades are `var(--brand-50)` to `var(--brand-950)`. You define those variables. |
| `{ 50: '#f8fafc', ..., 950: '#020617' }` | The 11 shades themselves. |

```ts
windiui({ default: 'slate', accent: { vars: '--brand' } });
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

The type is exported from `@windi-ui/core` as `ColorValue`.

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

## `build`

- Type: `(builder: Builder) => void`
- Default: none

Called after the built-in variants, sizes and components are registered and before CSS is generated. It runs
twice per compilation, see [Builder](/reference/builder#colors). Use the [builder](/reference/builder) to add, update or remove them. See
[Customizing](/guide/customizing) for a walkthrough.

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

That is about 60 small rules with Tailwind's default theme. To list fewer, leave the option off and write the
classes you need in the `safelist` of the Tailwind config.

### Tailwind v4

A plugin cannot safelist on Tailwind v4; the stylesheet does it with `@source inline()`. `safelistSource()`
returns the string to put there:

```ts
import { safelistSource } from '@windi-ui/tailwind';
import config from './windiui.config';

safelistSource(config);
// '{c-{accent,accent-accent,...,zinc},v-{default,light,outline,solid},s-{default,lg,sm,xl,xs}}'
safelistSource(config, { axes: ['c', 'v'] });
safelistSource(config, { axes: ['c'], palettes: ['red', 'green'] });
// 'c-{accent,accent-accent,accent-default,accent-green,accent-red,default,green,red}'
```

```css
@source inline("{c-{...},v-{default,light,outline,solid},s-{default,lg,sm,xl,xs}}");
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
  `default`, `accent`, the `accent-*` classes and the colors of `build` are always added.
- A `default` or `accent` option that names a palette needs that palette in the list.
- `safelist: true` on Tailwind v4 changes nothing. It logs a warning once with the `@source inline()` line
  for the classes that are registered in that build, which you can paste.

## `debug`

- Type: `boolean`
- Default: `false`

Logs what WindiUI otherwise skips silently. Today that is one message per theme palette that does not have all
11 shades and therefore gets no `c-*` class.

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

The `/v3` and `/v4` entries are for a setup where the automatic choice is wrong. All three plugin entries
work with `@plugin` and take the same options.

`@windi-ui/tailwind` also has these named exports, for Node.js:

- `defineConfig`, for a [config file](/reference/config-file#config-file).
- [`loadWindiUIConfig`](/reference/config-file#loadwindiuiconfig).
- [`safelistSource`](#tailwind-v4), and `classSource`, which writes given class names as the same brace
  expression.

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
| `theme.opacity` | The modifiers of `bg-v`, `text-v` and `border-v`. |
| `darkMode`, or on v4 the `dark` variant | The selector or media query for dark variant values, unless [`darkSelector`](#darkselector) is set. See [Dark mode](/guide/dark-mode). |

## What the plugin adds to the theme

| Theme color | Value |
| --- | --- |
| `c` (`c-50` to `c-950`) | The current palette, as references to `--wui-c-<shade>` |
| A palette added with [`utilities: true`](/reference/builder#colors) | Its shades, or references to its variables |
| `default` | Tailwind's `gray`, or references to `--wui-c-default-<shade>` when the [`default`](#default-and-accent) option is set |
| `accent` | Tailwind's `blue`, or references to `--wui-c-accent-<shade>` when the `accent` option is set |

## What the plugin generates

| Output | Selector |
| --- | --- |
| Default color, default and accent palettes, black and white | `:root`, or [`rootSelector`](#rootselector) |
| Default size | `:root`, or `rootSelector` |
| Reset of the variant variables | `:where([class*="v-"]) > *` (`variantScope: 'element'`) |
| Default variant | `*` (`variantScope: 'universal'` only) |
| One class per palette, plus one per accent palette | `.c-<name>`, `.c-accent-<name>` |
| One class per variant | `.v-<name>` |
| One class per size | `.s-<name>` |
| Variant utilities | `.bg-v`, `.text-v`, `.border-v` and their `-soft`, `-muted`, `-accent` levels |
| Variant boundary | `.v-scope` (not with `variantScope: 'universal'`) |
| Components | `.btn`, `.badge` and those you add |

As with any Tailwind utility, classes are only emitted when they are used in your content.
