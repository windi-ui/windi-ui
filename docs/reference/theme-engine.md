# Theme engine API

`@windi-ui/core/theme` and `@windi-ui/core/theme/palettes`. For a walkthrough see the
[Theme engine guide](/guide/theme-engine).

## `createEngine`

```ts
function createEngine(config?: Config, options?: EngineOptions): Engine;
```

Runs the [presets](/reference/options#presets), [`build`](/reference/options#build) and
[`overrides`](/reference/options#overrides) of `config` as the plugin does, over the palettes of `options`. `config`
is the object a [config file](/reference/config-file#config-file) exports. Options that only concern CSS, such as
`darkSelector`, `variantScope` or `safelist`, change nothing here.

### `EngineOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `palettes` | `Record<string, Palette>` | `{}` | The palettes of the theme, each its 11 shades as literal colors. Without `default` or `accent`, those are `gray` and `blue`, as in the plugin. |
| `spacing` | `Record<string, string>` | Tailwind's scale | Spacing values by key, over Tailwind's: `px` is `1px` and a number `n` is `n * 0.25rem`. |
| `fontSize` | `Record<string, FontSize>` | Tailwind 4's | Font sizes by key, over Tailwind 4's `xs` to `9xl`. |
| `metric` | `ContrastMetric` | `wcag2` | The metric of `contrast`. |

`spacing` and `fontSize` are what the builder's [`theme`](/reference/builder#theme) returns, for sizes of your own.

## `Engine`

| Method | Returns |
| --- | --- |
| `variants()` | The names of the variants, as the plugin's `v-*` classes. |
| `colors()` | The names of the colors, as the plugin's `c-*` classes. Each also has a `c-accent-*` class, which is not listed. With [`colors.only`](/reference/options#colors), the listed palettes and the colors of the builder. |
| `resolve(variant, color)` | A [`ResolvedVariant`](#resolvedvariant). Throws for a variant or color that does not exist. |
| `contrast(fg, bg)` | The contrast of two literal colors by the engine's metric: from 1 to 21 with WCAG 2. Throws for a value [`parseColor`](#parsecolor) does not read. |

### `ResolvedVariant`

```ts
interface ResolvedVariant {
	light: ResolvedMode;
	dark: ResolvedMode;
}

// `rest` and `hover`, and the other states of the variant's `pseudos`, by name without the colon
type ResolvedMode = Record<'rest' | 'hover', ResolvedState> & Partial<Record<string, ResolvedState>>;

// bg, bg-soft, bg-muted, bg-accent, border, ..., fg-accent
type ResolvedState = Record<ColorProperty, ResolvedColor>;

interface ResolvedColor {
	shade?: ExColorShade; // '600', 'accent-600', 'default-200', 'white', 'black'; left out for a literal color
	color: string;        // the literal color, or the variable of a palette given by CSS variables
	opacity: number;      // from 0 to 1
}
```

How a value is found, as the browser finds it from the CSS:

- A value the variant leaves out is the default variant's.
- In dark mode, the variant's `dark` values win over its light ones, which win over the default variant's.
- In a state the variant has in `pseudos`, a property it leaves out keeps its value at rest. A state the variant
  does not have at all, such as `hover` of a variant without `pseudos`, is the default variant's: the default's hover
  backgrounds, and the variant's values at rest for the other properties.
- An override of the color applies, and in dark mode a light override gives way to a dark value of the variant.
- A variable that is only set at runtime, such as one of [`overrideVars`](/guide/colors#variant-overrides-at-runtime),
  is taken as unset.

## `createThemeProvider`

```ts
function createThemeProvider(options?: ThemeProviderOptions): ThemeProvider;
```

The theme the engine runs on, for code that runs the generators of `@windi-ui/core` itself, with
`create(config).generator(theme)`. It takes `palettes`, `spacing` and `fontSize` as in [`EngineOptions`](#engineoptions), and paints a color with an
opacity as Tailwind 4 does: `color-mix(in oklab, <color> 50%, transparent)`.

## Contrast

### `parseColor`

```ts
function parseColor(value: string): Rgb; // [r, g, b], each from 0 to 1
```

Reads hex (`#fff`, `#ffff`, `#a16207`, `#a16207ff`), `rgb()` and `rgba()`, and `oklch()`, in the comma or the
space syntax, with numbers or percentages and `none`. `oklch()` is converted to sRGB and clipped to its gamut. Alpha is
ignored. Anything else throws.

### `wcag2`

```ts
const wcag2: ContrastMetric; // (fg: Rgb, bg: Rgb) => number
```

The contrast ratio of WCAG 2, from 1 to 21. The order of the two colors does not matter. A metric of your own has
the same type, and gets the text color first.

## Palettes

```ts
import { tailwind3, tailwind4 } from '@windi-ui/core/theme/palettes';
```

| Export | Palettes | Format |
| --- | --- | --- |
| `tailwind4` | The 26 of Tailwind 4.3's default theme, `mauve`, `olive`, `mist` and `taupe` included | `oklch(...)` |
| `tailwind3` | The 22 of Tailwind 3.4's default theme | hex |

Each is a `Record<string, Palette>`, where `Palette` is `Record<ColorShade, string>`.

## Variant values

Since 0.9 a value of a variant is typed as a shade or variable reference, such as `vars.color('600')`, or any color,
such as `'#fff'`. The engine resolves a literal as it is, with no `shade`. In the CSS it is written as given, so on
Tailwind 3 it has to be in the form of the theme's colors, RGB channels such as `'255 255 255'`.
