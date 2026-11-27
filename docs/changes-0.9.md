---
outline: [2, 3]
---

# Changes in 0.9

What you can observe when upgrading from 0.8. Class names, options, the builder API and the CSS are unchanged; every
entry is something new.

## Upgrading from 0.8

Nothing changes in an existing project: the built CSS is the same, and the new entries are only loaded when you
import them. Each section below ends with its migration notes.

## The theme engine

What the Tailwind plugin knows, palettes, variants and overrides, was only reachable inside a Tailwind build
([#45](https://github.com/windi-ui/windi-ui/issues/45)). New:

- The `@windi-ui/core/theme` entry, with `createEngine(config, { palettes })`. It runs the presets and `build` of a
  config on the generators of the plugin, with no Tailwind, no DOM and no Node built-ins, in Node, edge runtimes and
  browsers. See the [Theme engine guide](/guide/theme-engine).
- `engine.variants()` and `engine.colors()`, the names of the plugin's `v-*` and `c-*` classes.
- `engine.resolve(variant, color)`: the shade, literal color and opacity of each color property, in light and dark
  mode, at rest and on hover, with the overrides applied. A test compares it with the CSS the plugin emits.
- `engine.contrast(fg, bg)`: the WCAG 2 contrast of two colors given as hex, `rgb()` or `oklch()`, or another metric
  given as `metric`. `parseColor`, `wcag2` and `createThemeProvider` are exported as well.
- The `@windi-ui/tailwind/palettes` entry, with Tailwind's default palettes as literals: `tailwind4` and
  `tailwind3`. `tailwindcss` is now an optional peer dependency of `@windi-ui/tailwind`, so an app that only imports
  this entry installs no Tailwind.
- The type of a variant value, `VariantPropValue`, takes any color besides a shade or variable reference.

See the [Theme engine API](/reference/theme-engine).

**Migration:** none. To use the engine, add `@windi-ui/core` to the package that imports it, and
`@windi-ui/tailwind` for Tailwind's palettes.

## Palette specs

A palette could only be its 11 shades, a palette name or CSS variables
([#46](https://github.com/windi-ui/windi-ui/issues/46)). New, in `@windi-ui/core/theme`:

- `PaletteSpec`, a palette as a recipe: a base (`palette`, `seed`, `shades` or `curves`), an `adjust` (lightness,
  contrast, saturation, hue and `amount`) and `pins`, exact colors at given shades. It is plain JSON, so a theme can
  be stored and opened again with its sliders, curves and pins.
- `resolvePalette(spec, { palettes, format })` gives the 11 shades, as hex or `oklch()`. An unadjusted `palette` or
  `shades` comes back byte for byte. `generatePalette(seed)` is a palette from one color, which holds the seed at
  its anchor shade.
- `fitPalette`, `adjustCurves` and `samplePalette`, the steps of `resolvePalette`, for a theme editor; `parsePalette`
  validates a spec from outside and throws with the path of the field that is wrong.
- The same functions on the engine, where `resolvePalette` takes the engine's palettes.
- The builder's `addColor` and `setColor`, and the `colors.default` and `colors.accent` options, take a palette spec, resolved at
  build time to literal shades. `ColorValue` includes `PaletteSpec`, which `@windi-ui/core` exports as a type.

The shades a spec gives are fixed by a test, and a change to them is a breaking release. See
[Build palettes](/guide/theme-engine#build-palettes) and [Palette specs](/reference/theme-engine#palette-specs).

**Migration:** none. The theme entry is about 12 kB gzipped for a browser now, from 9 kB.

## Contrast calibration

A per-color override fixed a color that needs other shades, but someone had to know which colors those were
([#47](https://github.com/windi-ui/windi-ui/issues/47)). New:

- `engine.calibrate(colors, policy, { strategy })` in `@windi-ui/core/theme`. For every variant on each color, light
  and dark, at rest and in every state the variant declares, such as `:hover`, it checks `fg` on `bg` (`text`) and
  a visible `border` against the backdrop (`border`), with a translucent background painted over `backdrops`. It
  repairs a failing pair by choosing other shades, and returns only the differences, in the shape of the `overrides`
  option, with a report of the strategy each cell used.
- The strategies `'shift-bg'` (the default), `'flip-fg'` and `'anchor-seed'`, a function of your own, or a list
  tried in order. The policy takes a `metric`, for a contrast function other than WCAG 2.
- `calibrate(policy, options?)` on the builder, which fills the overrides of the build's palettes once the build is
  done. Explicit overrides win over it.
- The types of the policy, the options and a strategy function are exported from `@windi-ui/core` and
  `@windi-ui/core/theme`, with those of the result and the report from `@windi-ui/core/theme`.

With Tailwind's palettes and `{ text: 4.5 }`, every pair of the built-in and the `nuxt-ui` variants passes after
calibration, and `v-solid` changes for the nine palettes where white on 600 fails, and for no other. See
[Calibrate contrast](/guide/theme-engine#calibrate-contrast) and [Calibration](/reference/theme-engine#calibration).

**Migration:** none. Nothing is calibrated unless you call `calibrate`. The theme entry is about 14 kB gzipped for a
browser now, from 12 kB.

## Theme documents

Runtime theming had no single description of a theme, and no function that turned one into CSS variables: for a
`<style>` tag rendered per brand or tenant, a live preview in a theme editor, or literal colors for an email
([#48](https://github.com/windi-ui/windi-ui/issues/48)). New, in `@windi-ui/core/theme`:

- `ThemeDocument`, a theme as versioned JSON: `version`, a palette spec per color in `colors`, a `radius`, and
  `overrides` in the shape of the `overrides` option.
- `engine.parseTheme(json)`, which validates a document against the engine, unknown keys included, and throws with
  the path of the first field that is wrong.
- `engine.toCss(theme, options)`, the CSS variables of a document for the colors the config gives by `vars`: their
  11 shades, and the override variables they forward with `overrideVars` where the document changes them, light and
  dark, on any `selector`. The dark block always compounds the selector with `darkSelector`, so it also applies to
  `<html class="dark">`. `reset` isolates a scope from the page theme, `always` writes chosen variables even when
  they are unchanged, `calibrate` runs a calibration under the document's overrides first, and `channels` writes RGB
  channels for Tailwind 3. The CSS holds only values the engine writes, never a string of the document.
- `engine.toStatic(theme, options)`, the literal colors of a theme as hex, for every color, variant, mode, state and
  color property, with an opacity painted over a backdrop.
- The types of the document, the options and the result are exported from `@windi-ui/core/theme`.

A browser test checks that `toCss` next to a build of `vars` colors paints as a static build of the same palettes
and overrides, on Tailwind 4 and 3 and also on `<html class="dark">`, and that `reset` keeps a scope from the page
theme. See
[Theme documents](/guide/theme-engine#theme-documents) and [the reference](/reference/theme-engine#theme-documents).

**Migration:** none. The theme entry is about 16 kB gzipped for a browser now, from 14 kB.

## Manifest and generated types

The names of the `c-*`, `v-*` and `s-*` classes were only known inside the build, so apps typed them again by hand
for component props, a safelist, a gallery or a lint rule ([#49](https://github.com/windi-ui/windi-ui/issues/49)).
New:

- The `manifest` option, `{ json, dts }`, which writes the names the build registers to a JSON file and a
  declaration file with `WindiUIColor`, `WindiUIVariant` and `WindiUISize`. It is off by default, writes a file only
  when its content changes, and orders the names stably. It works on Tailwind 4 and 3, from JavaScript or a config
  file. Components are listed by class, after the [`componentPrefix`](/reference/options#componentprefix) of 0.8.2.
  See [`manifest`](/reference/options#manifest).
- `engine.manifest()`, the same object without a build, and `manifestTypes(manifest)`, the declaration file, in
  `@windi-ui/core` and `@windi-ui/core/theme` with the `Manifest` type. See [Manifest](/reference/theme-engine#manifest).
- `safelistSource()` takes a manifest in place of a config.
- `create(config).generator(theme)` returns a `manifest()` function next to the generators.

**Migration:** none. Without the option nothing is written.

## Contrast audit

Which variant and color pairs of a config fail 4.5:1 could only be answered by a script or a test matrix written by
hand ([#52](https://github.com/windi-ui/windi-ui/issues/52)). New:

- The `windiui` command in `@windi-ui/core`, with `windiui audit`. It loads the config file the plugin loads,
  `.ts` and `.js` included, or the one `--config` names, and prints the contrast of every variant on every color,
  light and dark, at rest and in every state the variant declares, with a translucent background painted over the
  backdrops. `--text`, `--border`, `--backdrop-light` and `--backdrop-dark` set the policy, `--palettes` adds
  palettes of your own, and `--format` prints a `table`, `markdown` or `json`. It exits with 1 when a pair fails, so
  it can gate CI, and with 2 on an error.
- `--fix`, which prints the `overrideVariant` calls calibration would add, ready to paste into `build`.
- `engine.audit(policy)` in `@windi-ui/core/theme`, the same matrix for a test of your own, with the `AuditCell` and
  `AuditResult` types.

WindiUI's CI audits the default config and the `nuxt-ui` preset, and a test pins their failures and the calls that
fix them. See [Contrast audit](/guide/contrast-audit) and [Audit](/reference/theme-engine#audit).

**Migration:** none. The command only runs when you call it.

## A palette at the call site

A palette given by CSS variables had to be declared in the config
([#50](https://github.com/windi-ui/windi-ui/issues/50)). `c-[--name]` now makes one where it is used, from the
variables `--name-50` to `--name-950`, and `c-accent-[--name]` does the same for the accent palette:

```html
<span class="c-[--brand] v-solid bg-v text-v">...</span>
```

```css
.c-\[--brand\] {
	--wui-c-50: var(--brand-50);
	/* ... */
	--wui-c-950: var(--brand-950);
}
```

All 11 variables must exist. The class resets the override variables like every color class, and works with
variants such as `md:c-[--brand]` and in `@apply`. Any other arbitrary value, such as `c-[#fff]`, still emits
nothing. See [A palette at the call site](/guide/colors#a-palette-at-the-call-site).

**Migration:** none. `c-[--name]` emitted nothing in 0.8.

## States given by any selector

`pseudos` only took pseudo-classes, so a variant could not describe the open, selected or invalid look that
headless component libraries mark with attributes ([#51](https://github.com/windi-ui/windi-ui/issues/51)). It now
takes any selector of the element, in `pseudos`, `dark.pseudos`, overrides and a component's
`applyVariantPseudos`:

```ts
windiui({
	states: { open: '[data-state=open]' },
	build: b => b.updateVariant('outline', (v, { vars }) => ({
		...v,
		pseudos: { ...v.pseudos, '[data-state=open]': { bg: vars.color('100'), 'bg-opacity': '1' } },
	})),
});
```

```html
<button class="v-outline apply-v-[hover,open]" data-state="open">...</button>
```

The variables of a pseudo-class keep their names, such as `--wui-v-bg-\:hover`. Another state is named by the new
[`states`](/reference/options#states) option, here `--wui-v-bg-open`, or else by its words, such as
`--wui-v-bg-data-highlighted`, so no name needs a bracket escaped. `apply-v` takes the same names.
[Calibration](/guide/theme-engine#calibrate-contrast) and [`windiui audit`](/guide/contrast-audit) check every
declared state but a disabled one, light and dark, and place a fix under that state's selector, as
`pseudos: { '[data-state=open]': { bg: '700' } }`; `overrideVars`' default, `'calibrated'`, forwards those values
too. See [States](/guide/customizing#states).

**Migration:** none. The variables and the output of pseudo-classes are unchanged.
