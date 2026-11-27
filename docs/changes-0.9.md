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
  and dark, at rest and on hover, it checks `fg` on `bg` (`text`) and a visible `border` against the backdrop
  (`border`), with a translucent background painted over `backdrops`. It repairs a failing pair by choosing other
  shades, and returns only the differences, in the shape of the `overrides` option, with a report of the strategy
  each cell used.
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
