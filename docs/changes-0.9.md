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
- The `@windi-ui/core/theme/palettes` entry, with Tailwind's default palettes as literals: `tailwind4` and
  `tailwind3`.
- The type of a variant value, `VariantPropValue`, takes any color besides a shade or variable reference.

See the [Theme engine API](/reference/theme-engine).

**Migration:** none. To use the engine, add `@windi-ui/core` to the package that imports it.
