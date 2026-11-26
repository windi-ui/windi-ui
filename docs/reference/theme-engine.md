# Theme engine API

`@windi-ui/core/theme` and `@windi-ui/core/theme/palettes`. For a walkthrough see the
[Theme engine guide](/guide/theme-engine).

## `createEngine`

```ts
function createEngine(config?: Config, options?: EngineOptions): Engine;
```

Runs the [presets](/reference/options#presets), [`build`](/reference/options#build) and
[`overrides`](/reference/options#overrides) of `config` as the plugin does, over the palettes of `options`. `config`
is the object a [config file](/reference/config-file#config-file) exports. Options that only concern the Tailwind build, such as
`darkSelector`, `variantScope`, `safelist` or `manifest`, change nothing here.

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
| `manifest()` | The names the config registers, as the plugin's [`manifest`](/reference/options#manifest) option writes them. See [Manifest](#manifest). |
| `resolve(variant, color)` | A [`ResolvedVariant`](#resolvedvariant). Throws for a variant or color that does not exist. |
| `contrast(fg, bg)` | The contrast of two literal colors by the engine's metric: from 1 to 21 with WCAG 2. Throws for a value [`parseColor`](#parsecolor) does not read. |
| `calibrate(colors, policy, options?)` | The overrides that make every variant on `colors` meet `policy`, and a report. See [Calibration](#calibration). |
| `parseTheme(json)`, `toCss(theme, options?)`, `toStatic(theme, options?)` | A theme document validated, as CSS variables, or as literal colors. See [Theme documents](#theme-documents). |
| `resolvePalette`, `generatePalette`, `fitPalette`, `adjustCurves`, `samplePalette`, `parsePalette` | See [Palette specs](#palette-specs). |

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

## Calibration

`engine.calibrate` and the builder's [`calibrate`](/reference/builder#calibrate). For a walkthrough see
[Calibrate contrast](/guide/theme-engine#calibrate-contrast).

```ts
engine.calibrate(
	colors: string[] | Record<string, CalibrationColor>,
	policy: CalibrationPolicy,
	options?: CalibrateOptions
): CalibrationResult;

type CalibrationColor = string | Palette | PaletteSpec; // a color of the engine, 11 shades, or a spec

interface CalibrationPolicy {
	text?: number;   // the lowest contrast of fg on bg; left out, not checked
	border?: number; // the lowest contrast of a visible border against the backdrop; left out, not checked
	backdrops?: { light?: string[]; dark?: string[] }; // default ['white'] and ['default-950']
	metric?: ContrastMetric; // default the engine's metric, WCAG 2 unless given
}

interface CalibrateOptions {
	strategy?: CalibrationStrategy | CalibrationStrategy[]; // default 'shift-bg'
}

type CalibrationStrategy = 'shift-bg' | 'flip-fg' | 'anchor-seed' | CalibrationStrategyFunction;

interface CalibrationResult {
	overrides: Record<string, Record<string, VariantOverride>>; // by variant, then color
	report: CalibrationReportEntry[];
}

interface CalibrationReportEntry {
	variant: string;
	color: string;
	mode: 'light' | 'dark';
	state: 'rest' | 'hover';
	strategy?: string; // left out when no strategy made the cell pass
	contrast: { text?: number; border?: number }; // after calibration, the lowest over the backdrops
}
```

An array of `colors` is the same as an object that maps each name to itself. A string names a color of the engine,
the colors of the builder included; a palette or a spec is resolved with the engine's palettes. Throws for an
unknown color, for a color whose shades are not literal (such as one given by CSS variables), and for a backdrop
in `backdrops` that is neither a literal color nor a shade of the root variables with a literal value.

### Checks

A cell is a (variant, color, mode, state), for every variant of the engine, light and dark, `rest` and `hover`. The
colors are those [`resolve`](#resolvedvariant) gives, with the overrides of the config.

| Check | Pair | Passes when |
| --- | --- | --- |
| `text` | `fg` with its opacity over `bg` with its opacity over the backdrop | `metric(fg, bg) >= text` over every backdrop |
| `border` | `border` with its opacity over the backdrop, when its opacity is not 0 | `metric(border, backdrop) >= border` over every backdrop |

Colors are blended in sRGB, as a browser composites them. A backdrop is a literal color or a shade of the root
variables: `'white'`, `'black'`, `'default-950'`, `'accent-100'`. A cell with a color that is not literal is not
checked. Nor is a check that needs a default backdrop that is not literal, such as `default-950` when the `default`
option is given by CSS variables: an opaque `fg` on an opaque `bg` is still checked.

### Strategies

The cells are calibrated in order: light at rest, light on hover, dark at rest, dark on hover. A cell that fails
gets each strategy in turn, from its state before any of them; the first fix after which the cell passes, applied as
an override, is kept.

| Strategy | Fix |
| --- | --- |
| `shift-bg` | For `text`, the offending shade, of `fg` and a visible `bg` the shade of the color nearer to 500 (`bg` on a tie), moves one shade at a time away from the other color, until the check passes; if it reaches the end of the ramp first, the other shade moves instead. For `border`, the border moves away from the backdrop. None when the end of the ramp is reached first. |
| `flip-fg` | `fg` for `text`, `border` for `border`, becomes the first that passes of 950, black, 50 and white, or of 50, white, 950 and black, by whether black or white reads better by WCAG 2. |
| `anchor-seed` | For a color from a `seed` spec, and a `text` failure whose offending shade is `bg`: at rest, `bg` becomes the seed's anchor shade; then `fg` stays if it passes, or flips as with `flip-fg`. None otherwise. |

```ts
type CalibrationStrategyFunction = (cell: CalibrationCell) => CalibrationFix | undefined;
type CalibrationFix = Partial<Record<'bg' | 'fg' | 'border', ExColorShade>>;

interface CalibrationCell {
	variant: string;
	color: string;
	mode: 'light' | 'dark';
	state: 'rest' | 'hover';
	values: ResolvedState; // the colors of the cell
	palette: Palette;      // the 11 shades of the color
	anchor?: ColorShade;   // for a color from a seed spec
	failing(fix?: CalibrationFix): ('text' | 'border')[]; // the checks that fail with fix applied
}
```

After a fix at rest, the hover value of each property it moves follows by as many shades, clamped to the ramp, when
it is a shade of its own and it is darker, or lighter, than what it is checked against in both states. The report
names a function by its `name`, or `custom`.

### Result

- `overrides` holds only values that change what `resolve` gives: a value under an explicit override, or one equal
  to what is there, is left out.
- A value of the config's overrides is never replaced. In dark mode a light value of theirs also holds where the
  variant has no dark value of its own.
- The result is deterministic: the same engine, colors, policy and options give the same overrides and report.
- `report` has an entry for each cell that failed before calibration, or on its turn after a fix to another cell.

## Theme documents

`engine.parseTheme`, `engine.toCss` and `engine.toStatic`. For a walkthrough see
[Theme documents](/guide/theme-engine#theme-documents).

```ts
engine.parseTheme(json: unknown): ThemeDocument;
engine.toCss(theme: ThemeDocument, options?: ToCssOptions): string;
engine.toStatic(theme: ThemeDocument, options?: ToStaticOptions): StaticTheme;

interface ThemeDocument {
	version: 1;
	colors?: Record<string, PaletteSpec>; // by color name
	radius?: string;                      // a length, written as --wui-radius
	overrides?: Record<string, Record<string, VariantOverride>>; // by variant, then color: shades as values
}

type ThemeCalibration = CalibrationPolicy & CalibrateOptions; // text, border, backdrops, metric and strategy

interface ToCssOptions {
	selector?: string;              // default ':root'
	darkSelector?: string;          // a selector, or 'media' (the default)
	reset?: boolean;                // default false
	always?: string[];              // 'variant.prop', such as 'solid.bg' or 'solid.bg-:hover'
	calibrate?: ThemeCalibration;
	channels?: boolean;             // default false
}

interface ToStaticOptions {
	backdrop?: { light?: string; dark?: string }; // default 'white' and 'default-950'
	calibrate?: ThemeCalibration;
}

type StaticTheme = Record<string, Record<string, StaticVariant>>; // by color, then variant
interface StaticVariant { light: StaticMode; dark: StaticMode }
type StaticMode = Record<'rest' | 'hover', StaticState> & Partial<Record<string, StaticState>>;
type StaticState = Record<ColorProperty, string>; // hex
```

### `parseTheme`

`parseTheme` returns a copy of the document, and throws ``WindiUI: invalid theme at `<path>`: <problem>.`` for the
first of these it finds. `toCss` and `toStatic` run it on the document they get.

| Field | Bounds |
| --- | --- |
| The document | An object with `version`, and `colors`, `radius` and `overrides` at most. |
| `version` | `1`. |
| `colors` | Color names (a letter, then letters, digits, `_` or `-`), each with a palette spec that [`parsePalette`](#validation) accepts; its path follows the color's, as in `colors.primary.adjust.hue`. |
| `radius` | `0`, or a number with `px`, `rem` or `em`. |
| `overrides` | Variants of the engine; under each, color names or comma lists of them; under each, an override. |
| An override | The color properties of a variant (`bg`, `bg-soft`, ..., `fg-accent`) with a shade of `ExColorShade` as value, the opacities (`bg-opacity`, `border-opacity`, `fg-opacity`) with `'0'`, `'1'` or `'0.<digits>'`, `pseudos` with states such as `':hover'` (a colon, then letters and `-`) of properties, and `dark`, which takes the same but `dark`. |

### `toCss`

The variables, on `selector`, in this order for each color of the engine: the 11 shades `{vars}-{shade}` of a color
the document gives, then the override variables `{vars}-{variant}-{prop}` that the color forwards with
[`overrideVars`](/guide/colors#variant-overrides-at-runtime). `radius` comes first, as `--{prefix}-radius`.

- A color of the document must be one the config gives by `vars`: its 11 shades are `var({vars}-{shade})`. Any other
  throws.
- A shade is written as hex, or as `oklch()` when the palette gives it so, or as RGB channels with `channels`. Every
  color is parsed and written again, so the CSS holds no string of the document.
- An override variable is written where its value, with the document applied, differs from its value while the
  variable is unset, as the build paints it. Its value is `var({vars}-{shade})` for a shade of the color (`accent-N`
  for an `-accent` prop), a root variable such as `var(--wui-c-white)` for another shade, or the opacity. A root
  variable resolves where `selector` declares it, so `accent-600` on a non-`-accent` prop is the accent there, not
  that of a `c-accent-*` class below.
- What the document overrides wins over the config's overrides. A value the color does not forward has no variable
  and is left out.
- `always` writes the variable of a `'variant.prop'` for every color that forwards it, even where it is unchanged.
- `reset` writes `initial` for every override variable of every color with `overrideVars` that it does not set.
- Dark: the variable is the same in both modes. The dark block sets it where the dark value differs from the light
  one, and writes `initial` where the light block set it and dark mode needs it unset. With a selector, the block is
  each selector of `selector` compounded with `:where(<dark>, <dark> *)`; with `'media'`, `selector` inside
  `@media (prefers-color-scheme: dark)`. A block with nothing to write is left out.
- With `calibrate`, the colors of the document are [calibrated](#calibration) with the document's overrides applied,
  and the result goes under them.
- The output is deterministic, and independent of the order of the document's keys.

### `toStatic`

- The colors are those of the engine whose shades are literal colors, with the document's palette where it gives
  one, then the colors of the document the engine does not have.
- The values are those [`resolve`](#resolvedvariant) gives, with the document's overrides over the config's and the
  calibration under them. A shade of `default` or `accent` is the document's palette when it gives one.
- `bg` props are painted at their opacity over the backdrop, `fg` and `border` props over the painted `bg`, as the
  background shows under a border in a browser; in sRGB.
- Throws for a color it needs that is not literal, such as `accent-600` with an `accent` given by `vars` that the
  document leaves out.

## Manifest

```ts
interface Manifest {
	prefix: string;
	colors: string[];      // sorted
	variants: string[];
	sizes: string[];
	components: string[];
	overrides: Record<string, string[]>;   // variant -> colors with an override of it, sorted
}

function manifestTypes(manifest: Manifest): string;
```

`engine.manifest()` returns the object the plugin's [`manifest`](/reference/options#manifest) option writes as JSON,
for scripts, tests and tools that run without a build. It is the same object when the engine has the palettes of the
theme the plugin builds with, such as `tailwind4` for Tailwind 4's default theme; a test compares the two on
Tailwind 4 and 3. The fields are described with the option.

`manifestTypes(manifest)` returns the declaration file the option writes: `WindiUIColor`, `WindiUIVariant` and
`WindiUISize`, each a union of the names, or `never` for an empty list. `Manifest` and `manifestTypes` are exported
from `@windi-ui/core` and `@windi-ui/core/theme`.

```ts
import { writeFileSync } from 'node:fs';
import { createEngine, manifestTypes } from '@windi-ui/core/theme';
import { tailwind4 } from '@windi-ui/core/theme/palettes';
import config from './windiui.config';

const manifest = createEngine(config, { palettes: tailwind4 }).manifest();
writeFileSync('windiui.manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync('src/windiui.d.ts', manifestTypes(manifest));
```

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

## Palette specs

A palette as a recipe, resolved to its 11 shades. For a walkthrough see
[Build palettes](/guide/theme-engine#build-palettes). The functions are exported from `@windi-ui/core/theme` and are
methods of the [engine](#engine) as well; `engine.resolvePalette` takes the engine's palettes unless `options` give
others.

```ts
type PaletteSpec = PaletteBase & {
	adjust?: PaletteAdjust;
	pins?: Partial<Record<ColorShade, string>>; // an exact color at a shade
};

type PaletteBase =                                        // exactly one key
	| { palette: string }                                 // a palette by name
	| { seed: string; anchor?: ColorShade; keepSeed?: boolean } // one color
	| { shades: Record<ColorShade, string> }              // all 11 shades
	| { curves: PaletteCurves };                          // drawn curves

interface PaletteAdjust {
	amount?: number;     // 0 to 200 %, default 100: how much of the four below applies
	lightness?: number;  // -30 to 30 %
	contrast?: number;   // -50 to 50 %
	saturation?: number; // -100 to 200 %
	hue?: number;        // -180 to 180 degrees
}

// One OKLCH channel as a cubic bezier over the ramp: x 0 is shade 50, x 1 is shade 950
interface ChannelCurve { y0: number; y1: number; p1x: number; p1y: number; p2x: number; p2y: number }
interface PaletteCurves { lightness: ChannelCurve; chroma: ChannelCurve; hue: ChannelCurve }
```

Colors are hex, `rgb()` or `oklch()`. `PaletteSpec` is also exported from `@windi-ui/core`, for configs.

| Function | Returns |
| --- | --- |
| `resolvePalette(spec, options?)` | The 11 shades of `spec`. `options` are `palettes`, the palettes a `palette` base names, and `format`, `'hex'` (the default) or `'oklch'`. Throws for an unknown palette or a color it cannot read. |
| `generatePalette(seed, options?)` | `resolvePalette({ seed, ...options })`, with `anchor` and `keepSeed`. |
| `fitPalette(shades)` | The curves nearest to a ramp of two or more of its 11 shades. Throws for fewer. |
| `adjustCurves(curves, adjust)` | The curves with `adjust` applied. |
| `samplePalette(curves, pins?, options?)` | The 11 shades of the curves with the pins applied; `options.format` as above. |
| `parsePalette(json)` | `json` as a `PaletteSpec` once validated. Throws with the path of the first field out of bounds. |

### Resolution

1. `{ palette }` or `{ shades }` with no `adjust` and no `pins` (or empty ones) is returned as given, byte for byte,
   whatever the `format`.
2. The base becomes curves. `palette` and `shades` are fitted with `fitPalette`; `curves` are taken as given. A `seed`
   takes the default curves, fitted to the mean lightness and chroma of Tailwind 4's 17 chromatic palettes, with the
   seed's hue and its chroma at the anchor. The anchor is `anchor`, or else the shade whose default lightness is
   nearest to the seed's. With `keepSeed`, the default, the seed is pinned at the anchor.
3. `adjust` applies to the curves: contrast spreads the lightness about the middle of its curve (the mean of `y0`
   and `y1`), lightness shifts it, saturation scales the chroma and hue turns the hue. Each is scaled by
   `amount / 100`.
4. 11 shades are sampled, at x 0, 0.1, ..., 1. Each pin is the shade's color exactly. The shades around a pin are
   pulled toward it by a Gaussian of one step, on lightness, chroma and hue (the short way round). A pin given in
   `pins` wins over the seed's. Every shade that is not pinned is brought into sRGB by reducing its chroma.

`fitPalette` fits each channel by least squares, with the handles on a grid of 0.05, and rounds the curves to four
decimals. The hue is unwrapped along the ramp, and a shade's hue counts as much as its chroma, so a gray shade's hue
counts for nothing.

### Validation

`parsePalette` throws ``WindiUI: invalid palette spec at `<path>`: <problem>.`` for the first of these it finds:

| Field | Bounds |
| --- | --- |
| The spec | An object with exactly one of `palette`, `seed`, `shades` and `curves`. No other keys than those, `anchor`, `keepSeed` (with `seed` only), `adjust` and `pins`. |
| `palette` | A name, not empty. |
| `seed`, `shades.*`, `pins.*` | Hex, `rgb()` or `oklch()`. |
| `anchor` | A shade, `'50'` to `'950'`. |
| `shades` | All 11 shades and no other keys. |
| `pins` | Shades only. |
| `curves` | `lightness`, `chroma` and `hue`, each with all six numbers, finite. `p1x` and `p2x` from 0 to 1; the y values from -0.5 to 1.5 for lightness (samples are clamped to 0 to 1), from 0 to 0.5 for chroma, from -360 to 720 for hue. |
| `adjust` | Integers in the ranges of `PaletteAdjust`, and no other keys. |

### Stability

The shades `resolvePalette` gives are a compatibility surface. A test fixes them for a set of specs, and a change to
them is a breaking release.

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
