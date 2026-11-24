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
2. **An unknown option name is an error.** `windui({ prefx: 'app' })` was ignored and now throws
   `WindUI: unknown option "prefx"`.

On Tailwind v4 you can replace `@config` with `@plugin "./windui.config.ts"` if the JavaScript config only
existed to load WindUI.
