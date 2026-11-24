# Changes in 0.8

What you can observe when upgrading from 0.7. Class names, options and the builder API are unchanged; every
entry is a bug fix with the same syntax, or something new.

## Arbitrary values are no longer hijacked

`bg-v`, `text-v` and `border-v` used to answer every arbitrary `bg-[...]`, `text-[...]` and `border-[...]`
class as well ([#30](https://github.com/windi-ui/windi-ui/issues/30)):

- On Tailwind 4, `bg-[#123456]` got a second, broken declaration: `background-color: var(--wui-v-bg-#123456)`.
- On Tailwind 3, `bg-[#123456]` and `text-[red]` were reported as ambiguous and dropped.

Both now produce exactly Tailwind's own output. `bg-v`, `bg-v-soft/60`, `bg-v/[0.3]` and the other variant
utilities are unchanged.

`c-[foo]`, `v-[foo]` and `s-[foo]` with an unknown value used to log `Color "foo" not found` (or the variant
or size equivalent) during the build. They now emit nothing and log nothing.

**Migration:** none. If you audited your built CSS or avoided arbitrary values because of this, you can stop.

## The Tailwind version no longer depends on the working directory

0.7 chose between its Tailwind 3 and Tailwind 4 code by reading `tailwindcss/package.json` from the working
directory when the plugin was loaded ([#32](https://github.com/windi-ui/windi-ui/issues/32)). That had three
effects, all gone:

- Importing the plugin from a directory that cannot resolve `tailwindcss`, such as a monorepo root or a test
  runner, threw.
- When the lookup failed, a Tailwind 4 project got Tailwind 3 output: `c` colors wrapped in
  `rgb(... / <alpha-value>)`.
- Loading the plugin as CommonJS logged `Failed to read Tailwind CSS package.json` and
  `Unsupported Tailwind CSS version: undefined` on every build.

The plugin now asks the Tailwind that runs it: the plugin API tells Tailwind 3 from Tailwind 4, and nothing is
read from disk. The CSS for a correctly detected project is unchanged.

**Migration:** none. If you start your build from a particular directory only to make the detection work, that
is no longer needed.

## The default variant no longer needs a `*` rule

0.7 set the `default` variant's variables, about 54 declarations with the dark block, on every element of the
page with a `*` rule ([#31](https://github.com/windi-ui/windi-ui/issues/31)). The new
[`variantScope`](/reference/options#variantscope) option chooses how this is done:

- `'element'`, the new default, drops the `*` rule. Variant utilities and components carry the `default`
  variant as a `var()` fallback, and one base rule keeps a variant from reaching the children of its element.
  In dark mode a two-declaration `*` rule is left, which sets the switches the fallbacks pick their dark value with.
  `btn`, `badge`, `bg-v`, `text-v` and `border-v` paint what they painted in 0.7, in light and dark mode.
- `'inherit'` is new behaviour: a `v-*` class sets the variant for everything inside its element.
- `'universal'` is the 0.7 output, byte for byte.

Also new: the `v-scope` utility, `varsProvider` exported from `@windi-ui/core`, and
`vars.variant(name, { fallback: true })`.

**Migration:** two cases behave differently with the new default.

1. **Your own CSS reads a variant variable on an element without a variant**, for example
   `input { background: var(--wui-v-bg) }`. Without the `*` rule that variable is not set there, so the
   declaration is invalid (a transparent background). Pick one:
   - set `variantScope: 'universal'`, and nothing changes;
   - give the element a variant: a `v-*` class, or `@apply v-default v-scope` in the rule;
   - in CSS built in JavaScript, use `vars.variant('bg', { fallback: true })`.

   Components added with the builder need no change: bare reads in their `style` get the fallback.
2. **A rule gets its variant from `@apply v-*`.** Its children now inherit that variant, because the element
   has no `v-` in its `class` attribute. Add `v-scope`: `@apply v-solid v-scope`.

## Tailwind v4 loads WindUI with `@plugin`

In 0.7, `@plugin "@windi-ui/tailwind";` compiled and emitted nothing: Tailwind v4 took the plugin factory for
a plugin ([#33](https://github.com/windi-ui/windi-ui/issues/33)). It now loads WindUI, in three forms:

```css
@plugin "@windi-ui/tailwind";                      /* zero config */
@plugin "@windi-ui/tailwind" { prefix: app; }      /* options, in kebab-case */
@plugin "./windui.config.ts";                      /* a module that exports windui({ ... }) */
```

Also new:

- [Config files](/reference/config-file): `windui.config.{ts,mts,cts,js,mjs,cjs,json}` and
  `package.json#windui` are found from the working directory, or named with the new
  [`config`](/reference/options#config) option. Inline options override the file.
- `@windi-ui/tailwind/v4` and `@windi-ui/tailwind/v3`, which build for one Tailwind major whatever runs them.
  `/v4` is typed for Tailwind v4's `Config`, so a v4 JavaScript config no longer needs `@ts-expect-error`.
- `defineConfig`, from `@windi-ui/core` and `@windi-ui/tailwind/config`.
- `loadWindUIConfig()` from `@windi-ui/tailwind/config`, for tools that need the config the plugin uses.

`plugins: [windui()]` and `plugins: [windui({...})]` work as before, on Tailwind v3 and v4.

**Migration:** none is required. Two things can be observed in an existing setup:

1. **A call without `build` now looks for a config file.** If a `windui.config.*` file or a `windui` key in
   `package.json` already exists for another purpose, `windui()` and `windui({ prefix })` read it. Pass
   `config: false` to keep them from looking.
2. **An unknown option name logs a warning.** `windui({ prefx: 'app' })` was ignored silently. It is still
   ignored, and now logs `WindUI: unknown option "prefx"`. In an `@plugin` block, which is new, it is an error.

On Tailwind v4 you can replace `@config` with `@plugin "./windui.config.ts"` if the JavaScript config only
existed to load WindUI.

## Dark mode follows the app's dark variant on Tailwind v4

0.7 took the dark selector from the `darkMode` key of the Tailwind config. A Tailwind v4 project without a
JavaScript config has no such key, so WindUI used `@media (prefers-color-scheme: dark)` even when the
stylesheet declared `@custom-variant dark (&:where(.dark, .dark *));`
([#34](https://github.com/windi-ui/windi-ui/issues/34)). Tailwind's `dark:` utilities followed the class, and
`btn`, `badge`, `bg-v`, `text-v` and `border-v` followed the operating system.

On Tailwind v4.1.17 or higher, WindUI now writes `@variant dark` and Tailwind puts the app's own dark variant
in. Variants turn dark exactly when `dark:` utilities do, with nothing to configure.

Also new: the [`darkSelector`](/reference/options#darkselector) option (`dark-selector` in an `@plugin`
block). It takes every form of Tailwind's `darkMode`, and a bare selector such as `'.dark'`.

What does not change:

- Tailwind v3.
- Tailwind v4 with a `darkMode` key in a config loaded by `@config`.
- Tailwind v4 without a `@custom-variant dark`: Tailwind's dark variant is the media query there, and the
  CSS is the same as before.
- Tailwind v4.0.0 to 4.1.16, which do not expand `@variant dark` for a plugin: still the media query. Set
  `darkSelector` there.

**Migration:** only for a Tailwind v4 project that declares `@custom-variant dark` and does not set `darkMode`
in a JavaScript config. Its variants now follow that declaration instead of the operating system, which is
what the declaration asks for. To keep the 0.7 output, set `darkSelector: 'media'`
(`dark-selector: media;`).

## `default` and `accent` can be chosen

`default` was always `gray` and `accent` always `blue`
([#35](https://github.com/windi-ui/windi-ui/issues/35)). The new
[`default` and `accent`](/reference/options#default-and-accent) options take a palette name, CSS variables or
the 11 shades:

```ts
windui({ default: 'slate', accent: 'indigo' });
```

Without an option nothing changes for a default setup: the CSS is the same as before.

Also new: the [`debug`](/reference/options#debug) option.

**Migration:** none is required. Three things can be observed:

1. **The "does not have all 11 shades" warning is gone.** A theme palette with fewer shades, such as
   `brand: { 500: ..., 600: ... }`, logged it on every build. It is now only logged with `debug: true`.
2. **A `default` or `accent` palette in a Tailwind v4 `@theme` block now reaches WindUI.** In 0.7,
   `--color-default-*` changed `bg-default-*` but not `--wui-c-default-*`, `c-default` or the color of an
   element without a `c-*` class, which stayed gray. They now follow the theme, like `bg-default-*` does.
3. **A theme palette that sets only some shades of `default` or `accent` logs a warning.** The output is the
   0.7 output, a mix with `gray` or `blue`; the warning names the shades that are missing.

With an option and a theme palette of the same name, the theme utilities (`bg-default-*`) keep the theme's
palette and WindUI logs a warning; see [`default` and `accent`](/reference/options#default-and-accent).

## Colors from the builder, and `rootSelector`

The builder had add, update and remove for variants, sizes and components, but not for colors
([#36](https://github.com/windi-ui/windi-ui/issues/36)). New:

- `addColor`, `setColor`, `updateColor` and `removeColor`. A color is given as CSS variables
  (`{ vars: '--ui-color-primary' }`), as its 11 shades, or as the name of a palette that exists. See
  [Palettes from the builder](/guide/colors#palettes-from-the-builder).
- `{ utilities: true }` also registers the color with Tailwind, for `bg-primary-500` and the like.
- The [`rootSelector`](/reference/options#rootselector) option declares the root color and size variables on
  more than `:root`, for themes scoped to a container.
- `Builder`, `ColorValue` and `ColorOptions` are exported as types from `@windi-ui/core`.

**Migration:** none is required. Two things can be observed:

1. **`build` runs twice per compilation**, the first time on a builder that only notes colors. A `build`
   function that does other work, such as logging, does it twice.
2. **A var-backed theme color on Tailwind v3 no longer logs `Unsupported color format`.** A value that
   contains `var(` is taken to hold RGB channels and is used as it is, which is what happened after the
   warning.

## A safelist for class names built at runtime

`c-${color}` and `v-${variant}` built from component props are not found by Tailwind's scanner, and apps kept
a hand-written safelist for them ([#37](https://github.com/windi-ui/windi-ui/issues/37)). New:

- On Tailwind v3, the [`safelist`](/reference/options#safelist) option emits every `c-*`, `v-*` and `s-*`
  class.
- On Tailwind v4, `safelistSource()` from the new `@windi-ui/tailwind/safelist` entry returns the string for
  one `@source inline("...")` line in the stylesheet.

**Migration:** none. Without the option the output is unchanged.
