# Options

`@windi-ui/tailwind` default-exports a function that takes the options and returns a Tailwind plugin. The
same options can be given in three places:

::: code-group

```ts [JavaScript]
import windui from '@windi-ui/tailwind';

windui({
	prefix: 'wui',
	variantScope: 'element',
	build(builder) {
		// ...
	}
});
```

```css [@plugin block (Tailwind v4)]
@plugin "@windi-ui/tailwind" {
	prefix: wui;
	variant-scope: element;
}
```

```ts [windui.config.ts]
import { defineConfig } from '@windi-ui/tailwind/config';

export default defineConfig({
	prefix: 'wui',
	variantScope: 'element',
	build(builder) {
		// ...
	}
});
```

:::

- An `@plugin` block takes the options that are plain values, with their names in kebab-case. `build` is a
  function, so it needs JavaScript: a [config module or a config file](/reference/config-file).
- Options given inline, in JavaScript or in the block, override those of a config file.
- An option name WindUI does not know is an error.

All options are optional. The type is exported from `@windi-ui/core` as `Config`.

## `prefix`

- Type: `string`
- Default: `'wui'`

The prefix of every CSS variable WindUI writes and reads: `--<prefix>-c-*`, `--<prefix>-v-*` and
`--<prefix>-s-*`. It does not change class names; `c-*`, `v-*`, `s-*`, `btn` and `badge` stay the same.

```ts
windui({ prefix: 'app' }); // --app-c-500, --app-v-bg, --app-s-text
```

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

:root {
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
- **Other classes with `v-`.** The reset rule also matches classes such as `nav-item`. The only effect is that
  their children get the same reset.

## `build`

- Type: `(builder: Builder) => void`
- Default: none

Called once per compilation, after the built-in variants, sizes and components are registered and before CSS is
generated. Use the [builder](/reference/builder) to add, update or remove them. See
[Customizing](/guide/customizing) for a walkthrough.

## `config`

- Type: `string | false`
- Default: none
- Not read from a config file

The [config file](/reference/config-file) to load, relative to the working directory. Without it, a call that
passes no `build` searches for `windui.config.*` and `package.json#windui`. `false` turns that search off.

```css
@plugin "@windi-ui/tailwind" {
	config: "./config/windui.ts";
}
```

## Entry points

| Import | What it is |
| --- | --- |
| `@windi-ui/tailwind` | The plugin. It builds for the Tailwind that runs it. |
| `@windi-ui/tailwind/v4` | The same, always building for Tailwind v4 and typed for v4's `Config`. |
| `@windi-ui/tailwind/v3` | The same, always building for Tailwind v3. |
| `@windi-ui/tailwind/config` | `defineConfig` and [`loadWindUIConfig`](/reference/config-file#loadwinduiconfig). Node.js only. |

The `/v3` and `/v4` entries are for a setup where the automatic choice is wrong. All three plugin entries
work with `@plugin` and take the same options.

## What the plugin reads from Tailwind

These are not WindUI options, but they shape its output:

| Tailwind setting | Used for |
| --- | --- |
| `theme.colors` | The `c-*` classes: one per palette with all 11 shades. See [Colors](/guide/colors). |
| `theme.spacing`, `theme.fontSize` | The values of the built-in [sizes](/guide/sizes). |
| `theme.opacity` | The modifiers of `bg-v`, `text-v` and `border-v`. |
| `darkMode` | The selector or media query for dark variant values. See [Dark mode](/guide/dark-mode). |

## What the plugin adds to the theme

| Theme color | Value |
| --- | --- |
| `c` (`c-50` to `c-950`) | The current palette, as references to `--wui-c-<shade>` |
| `default` | Tailwind's `gray` |
| `accent` | Tailwind's `blue` |

Options for the `default` and `accent` palettes are tracked in
[#35](https://github.com/windi-ui/windi-ui/issues/35).

## What the plugin generates

| Output | Selector |
| --- | --- |
| Default color, default and accent palettes, black and white | `:root` |
| Default size | `:root` |
| Reset of the variant variables | `:where([class*="v-"]) > *` (`variantScope: 'element'`) |
| Default variant | `*` (`variantScope: 'universal'` only) |
| One class per palette, plus one per accent palette | `.c-<name>`, `.c-accent-<name>` |
| One class per variant | `.v-<name>` |
| One class per size | `.s-<name>` |
| Variant utilities | `.bg-v`, `.text-v`, `.border-v` and their `-soft`, `-muted`, `-accent` levels |
| Variant boundary | `.v-scope` (not with `variantScope: 'universal'`) |
| Components | `.btn`, `.badge` and those you add |

As with any Tailwind utility, classes are only emitted when they are used in your content.
