# Introduction

WindiUI is a Tailwind CSS plugin for building components that can be recolored, restyled and resized with
three short classes, without writing a class list per combination.

::: warning Under development
WindiUI is pre-1.0. This site documents `0.9`; what differs from `0.8.x` is in [Changes in 0.9](/changes-0.9).
See the [roadmap](/roadmap) for what is coming.
:::

## The three axes

| Axis | Class | What it sets | Examples |
| --- | --- | --- | --- |
| Color | `c-*` | The current palette: 11 shades as CSS variables | `c-blue`, `c-red`, `c-accent-green` |
| Variant | `v-*` | Which shade is used for background, border and text | `v-default`, `v-solid`, `v-outline`, `v-light` |
| Size | `s-*` | A spacing and font size scale | `s-xs`, `s-sm`, `s-md`, `s-lg`, `s-xl` |

Each class only sets CSS variables (`--wui-c-*`, `--wui-v-*`, `--wui-s-*`). Nothing is painted until a
component or a utility reads them:

<Demo>
<button class="btn v-solid c-blue">btn v-solid c-blue</button>
<button class="btn v-outline c-blue">btn v-outline c-blue</button>
<button class="btn v-outline c-red">btn v-outline c-red</button>
<button class="btn v-outline c-red s-sm">btn v-outline c-red s-sm</button>
</Demo>

```html
<button class="btn v-solid c-blue">...</button>
<button class="btn v-outline c-blue">...</button>
<button class="btn v-outline c-red">...</button>
<button class="btn v-outline c-red s-sm">...</button>
```

Because they are plain CSS variables, the color and size axes inherit. Set `c-red` on a card and every `btn`,
`badge` or `bg-v` inside it is red until a descendant sets another color. Variants stay on their element by
default: set `v-*` on the element that is painted, or let a container set it for its content with
[`variantScope: 'inherit'`](/reference/options#variantscope) (see [Variants](/guide/variants#where-to-put-the-class)).

## How variants pick shades

A palette has 11 shades: `50`, `100` to `900`, and `950`. A variant is a table that says which shade each
property uses. For example, `v-solid` uses shade `600` for the background, white for the text, and shade
`700` for the background on hover. `v-light` uses `100` for the background and `600` for the text.

| Class | Sets | To |
| --- | --- | --- |
| `c-blue` | `--wui-c-600` | Tailwind's `blue-600` |
| `v-solid` | `--wui-v-bg` | `var(--wui-c-600)` |
| `btn` | `background-color` | `var(--wui-v-bg)` |

So a component never names a shade or a color. It asks for "the variant background" and the two axes
resolve it. The shade tables are calibrated per variant and include dark mode values; see
[Variants](/guide/variants) for the full tables.

## What is included

- `c-*`, `v-*` and `s-*` classes for every palette, variant and size.
- Theme colors `c-50` to `c-950` that follow the current color: `bg-c-100`, `text-c-700`. See [Colors](/guide/colors).
- Variant utilities: `bg-v`, `text-v`, `border-v` and their `soft`, `muted` and `accent` levels, and `apply-v`,
  which paints an element from its variant, hover included. See [Utilities](/guide/utilities).
- Two components, `btn` and `badge`. See [Components](/guide/components).
- A [builder API](/guide/customizing) to add, replace, change or remove colors, variants, sizes and components,
  and to [override a variant for some colors](/guide/customizing#override-a-variant-for-some-colors).
- [Presets](/guide/presets), packaged sets of variants: `nuxt-ui` ships with WindiUI.
- Palettes given by CSS variables, for [themes set at runtime](/guide/theming).

## Packages

| Package | Purpose |
| --- | --- |
| [`@windi-ui/tailwind`](https://www.npmjs.com/package/@windi-ui/tailwind) | The Tailwind CSS plugin. This is the one you install. |
| [`@windi-ui/core`](https://www.npmjs.com/package/@windi-ui/core) | Framework-independent generator used by the plugin: variants, sizes, components, CSS variable names. |
