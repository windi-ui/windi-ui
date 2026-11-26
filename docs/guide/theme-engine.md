# Theme engine

The Tailwind plugin knows every palette, variant and override of your config, but only inside a Tailwind build.
The theme engine gives the same knowledge to code that runs anywhere else: a server that writes a `<style>` tag per
brand or tenant, a theme editor that previews in the browser, an email renderer that needs literal colors, or a test
that checks contrast.

It is `@windi-ui/core/theme`: plain TypeScript with no Tailwind, no DOM and no Node built-ins, which runs in Node,
edge runtimes and browsers. It runs your presets and `build` on the generators the plugin uses, so the two agree.

::: info New in 0.9
The theme engine so far: variants, contrast, palettes, contrast calibration and theme documents. See the
[roadmap](https://github.com/windi-ui/windi-ui/issues/26) for what comes next.
:::

## Install

The engine is in `@windi-ui/core`, which `@windi-ui/tailwind` depends on. Add it to the package that imports it:

```sh
pnpm add @windi-ui/core
```

## Create an engine

Share one config between the plugin and the engine. A [config file](/reference/config-file#config-file) is the
simplest way: the plugin finds it, and your code imports it.

```ts [windiui.config.ts]
import { defineConfig } from '@windi-ui/core';

export default defineConfig({
	presets: ['nuxt-ui'],
	overrides: { solid: { 'amber,yellow,lime': { bg: '700', pseudos: { ':hover': { bg: '800' } } } } },
});
```

```ts
import { createEngine } from '@windi-ui/core/theme';
import { tailwind4 } from '@windi-ui/core/theme/palettes';
import config from './windiui.config';

const engine = createEngine(config, { palettes: tailwind4 });

engine.variants(); // ['default', 'solid', 'outline', 'light', 'soft', 'subtle', 'ghost', 'link']
engine.colors();   // ['red', 'orange', ..., 'default', 'accent']
```

`defineConfig` from `@windi-ui/core` keeps the config free of Tailwind, so a browser or edge bundle can import it.
The one from `@windi-ui/tailwind` is the same function.

The plugin reads its palettes from the Tailwind theme; the engine takes them as `palettes`, each with its 11 shades as
literal colors. `@windi-ui/core/theme/palettes` has Tailwind's default palettes, `tailwind4` as `oklch()` and
`tailwind3` as hex. It is an entry of its own, so a bundle that does not import it does not carry it. Your own
palettes go next to them:

```ts
createEngine(config, { palettes: { ...tailwind4, brand: { 50: '#f0fdfa', /* ... */ 950: '#042f2e' } } });
```

As in the plugin, `default` and `accent` are the palettes of those names, or else `gray` and `blue`, unless the
[`default` and `accent`](/reference/options#default-and-accent) options choose others.

## Resolve a variant

`resolve(variant, color)` gives what a variant paints on an element of that color: for each color property, the
shade, the literal color and the opacity, in light and dark mode, at rest and on hover, with your overrides applied.

```ts
const solid = engine.resolve('solid', 'yellow');

solid.light.rest.bg;   // { shade: '700', color: 'oklch(55.4% 0.135 66.442)', opacity: 1 }, from the override
solid.light.rest.fg;   // { shade: 'white', color: '#fff', opacity: 1 }
solid.light.hover.bg;  // { shade: '800', color: 'oklch(47.6% 0.114 61.907)', opacity: 1 }
solid.dark.rest.fg;    // the same in dark mode, where `solid` has no values of its own
```

- Each state has all 12 color properties: `bg`, `border` and `fg`, each with `-soft`, `-muted` and `-accent`. A value
  the variant leaves out is the default variant's, as in the CSS.
- `shade` is a shade of the color (`'700'`), of the accent or default palette (`'accent-600'`, `'default-200'`), or
  `'white'` or `'black'`. A variant value that is a color of its own, such as `'#fff'`, has no `shade`.
- `opacity` is the opacity of the property, such as `0` for the border of `v-solid`.
- `hover` is always there. A variant with other states in `pseudos` has them too, by name: `active`, `focus-visible`.
- A palette given by CSS variables has no literal color at build time: `color` is the variable, such as
  `var(--ui-color-brand-700)`.

The values are the ones the plugin emits: a test compiles the CSS for every built-in variant and color and compares.

## Check contrast

`contrast(fg, bg)` is the contrast of two literal colors, by WCAG 2 unless you give another metric:

```ts
const { fg, bg } = engine.resolve('solid', 'yellow').light.rest;
engine.contrast(fg.color, bg.color); // 4.92: white on yellow 700 passes 4.5:1
engine.contrast('#fff', tailwind4.yellow[600]); // 2.93: white on 600 does not
```

It reads hex, `rgb()` and `oklch()`, and ignores alpha: for a color with an opacity, blend it over what is behind it
first. Anything else, such as a `var()`, throws.

A test of your own can check every pair:

```ts
for (const color of engine.colors()) {
	const { fg, bg } = engine.resolve('solid', color).light.rest;
	expect(engine.contrast(fg.color, bg.color)).toBeGreaterThanOrEqual(4.5);
}
```

The metric is a function of two sRGB colors, so another one plugs in:

```ts
import { createEngine, type ContrastMetric } from '@windi-ui/core/theme';

const metric: ContrastMetric = (fg, bg) => /* ... */;
createEngine(config, { palettes: tailwind4, metric });
```

## Build palettes

A palette is 11 shades, but an app often has less to go on: one brand color, a palette of Tailwind's that should be a
little calmer, or a shade that has to be exactly the one in the brand guide. A **palette spec** describes the palette
as a recipe, and `resolvePalette` turns it into the 11 shades:

```ts
import { generatePalette, resolvePalette } from '@windi-ui/core/theme';

generatePalette('#2563eb');
// { 50: '#f4f8ff', 100: '#e7efff', ..., 700: '#2563eb', 800: '#1a4bb9', 900: '#133889', 950: '#0f285d' }

engine.resolvePalette({ palette: 'blue', adjust: { saturation: -20 } }); // the engine's blue, less saturated

resolvePalette({ seed: '#f5b301', anchor: '400', adjust: { amount: 80, contrast: 10 }, pins: { 900: '#5a3d00' } });
```

A spec has three layers:

1. **A base**, exactly one of: `palette`, a palette by name; `seed`, one color; `shades`, all 11; `curves`, the
   lightness, chroma and hue of the ramp drawn as three curves.
2. **`adjust`**, a lens over the base: `lightness` shifts it, `contrast` spreads it, `saturation` scales the chroma,
   `hue` turns it, and `amount` scales all four. The base stays as it is, so a slider can go back to 0.
3. **`pins`**, an exact color at a shade. The shades around it bend to it smoothly, and no adjustment moves it.

The engine works in OKLCH. A base becomes three curves over the ramp, the adjustment applies to the curves, and the
11 shades are sampled from them, with the pins added and each shade brought into sRGB by reducing its chroma. The
result is hex, or `oklch()` with `format: 'oklch'`.

### From one color

A `seed` gets the default curves, which are fitted to the mean of Tailwind 4's 17 chromatic palettes, with the hue
and the chroma of the seed. The seed stands for the shade of the nearest lightness, or the `anchor` you give, and is
pinned there, so the palette holds it exactly; `keepSeed: false` leaves it out.

```ts
generatePalette('#2563eb');                    // the seed at 700, the shade of its lightness
generatePalette('#2563eb', { anchor: '600' }); // at 600, as in Tailwind's blue
```

The default curves are one compromise for every hue: Tailwind's own palettes differ from them, blue being darker and
yellow lighter at the same shade. Below, each seed's palette over the Tailwind 4 palette nearest to the seed; the
outlined shade is the seed.

<style>
.ramp { display: flex; align-items: center; gap: 2px; margin: 2px 0; }
.ramp code { width: 5.5rem; flex: none; font-size: 0.8em; }
.ramp span { flex: 1; height: 1.5rem; border-radius: 3px; }
.ramp span.seed { outline: 2px solid var(--vp-c-text-1); outline-offset: 1px; }
.ramp-pair { margin-bottom: 0.75rem; }
</style>

<div class="ramp-pair">
<div class="ramp"><code>#f5b301</code><span style="background: #fff6e7"></span><span style="background: #ffeccb"></span><span style="background: #fed790"></span><span style="background: #f5b301" class="seed"></span><span style="background: #dda100"></span><span style="background: #c38e00"></span><span style="background: #a57800"></span><span style="background: #896200"></span><span style="background: #6e4e00"></span><span style="background: #543b00"></span><span style="background: #3b2800"></span></div>
<div class="ramp"><code>yellow</code><span style="background: oklch(98.7% 0.026 102.212)"></span><span style="background: oklch(97.3% 0.071 103.193)"></span><span style="background: oklch(94.5% 0.129 101.54)"></span><span style="background: oklch(90.5% 0.182 98.111)"></span><span style="background: oklch(85.2% 0.199 91.936)"></span><span style="background: oklch(79.5% 0.184 86.047)"></span><span style="background: oklch(68.1% 0.162 75.834)"></span><span style="background: oklch(55.4% 0.135 66.442)"></span><span style="background: oklch(47.6% 0.114 61.907)"></span><span style="background: oklch(42.1% 0.095 57.708)"></span><span style="background: oklch(28.6% 0.066 53.813)"></span></div>
</div>
<div class="ramp-pair">
<div class="ramp"><code>#2563eb</code><span style="background: #f4f8ff"></span><span style="background: #e7efff"></span><span style="background: #d0e1ff"></span><span style="background: #adcaff"></span><span style="background: #86afff"></span><span style="background: #5f94ff"></span><span style="background: #3a78ff"></span><span style="background: #2563eb" class="seed"></span><span style="background: #1a4bb9"></span><span style="background: #133889"></span><span style="background: #0f285d"></span></div>
<div class="ramp"><code>blue</code><span style="background: oklch(97% 0.014 254.604)"></span><span style="background: oklch(93.2% 0.032 255.585)"></span><span style="background: oklch(88.2% 0.059 254.128)"></span><span style="background: oklch(80.9% 0.105 251.813)"></span><span style="background: oklch(70.7% 0.165 254.624)"></span><span style="background: oklch(62.3% 0.214 259.815)"></span><span style="background: oklch(54.6% 0.245 262.881)"></span><span style="background: oklch(48.8% 0.243 264.376)"></span><span style="background: oklch(42.4% 0.199 265.638)"></span><span style="background: oklch(37.9% 0.146 265.522)"></span><span style="background: oklch(28.2% 0.091 267.935)"></span></div>
</div>
<div class="ramp-pair">
<div class="ramp"><code>#e11d48</code><span style="background: #fff5f5"></span><span style="background: #ffe9e9"></span><span style="background: #ffd4d4"></span><span style="background: #ffb1b3"></span><span style="background: #ff878e"></span><span style="background: #ff4a63"></span><span style="background: #e11d48" class="seed"></span><span style="background: #c0133b"></span><span style="background: #9b1330"></span><span style="background: #761224"></span><span style="background: #51121a"></span></div>
<div class="ramp"><code>rose</code><span style="background: oklch(96.9% 0.015 12.422)"></span><span style="background: oklch(94.1% 0.03 12.58)"></span><span style="background: oklch(89.2% 0.058 10.001)"></span><span style="background: oklch(81% 0.117 11.638)"></span><span style="background: oklch(71.2% 0.194 13.428)"></span><span style="background: oklch(64.5% 0.246 16.439)"></span><span style="background: oklch(58.6% 0.253 17.585)"></span><span style="background: oklch(51.4% 0.222 16.935)"></span><span style="background: oklch(45.5% 0.188 13.697)"></span><span style="background: oklch(41% 0.159 10.272)"></span><span style="background: oklch(27.1% 0.105 12.094)"></span></div>
</div>
<div class="ramp-pair">
<div class="ramp"><code>#16a34a</code><span style="background: #f1faf2"></span><span style="background: #e0f6e3"></span><span style="background: #c3edc9"></span><span style="background: #96dda3"></span><span style="background: #5dcc78"></span><span style="background: #2eb85a"></span><span style="background: #16a34a" class="seed"></span><span style="background: #008337"></span><span style="background: #00662a"></span><span style="background: #044d1f"></span><span style="background: #0b3517"></span></div>
<div class="ramp"><code>green</code><span style="background: oklch(98.2% 0.018 155.826)"></span><span style="background: oklch(96.2% 0.044 156.743)"></span><span style="background: oklch(92.5% 0.084 155.995)"></span><span style="background: oklch(87.1% 0.15 154.449)"></span><span style="background: oklch(79.2% 0.209 151.711)"></span><span style="background: oklch(72.3% 0.219 149.579)"></span><span style="background: oklch(62.7% 0.194 149.214)"></span><span style="background: oklch(52.7% 0.154 150.069)"></span><span style="background: oklch(44.8% 0.119 151.328)"></span><span style="background: oklch(39.3% 0.095 152.535)"></span><span style="background: oklch(26.6% 0.065 152.934)"></span></div>
</div>
<div class="ramp-pair">
<div class="ramp"><code>#7c3aed</code><span style="background: #f7f6ff"></span><span style="background: #efecff"></span><span style="background: #e1dbff"></span><span style="background: #cbbfff"></span><span style="background: #b49fff"></span><span style="background: #9f7cff"></span><span style="background: #8e57ff"></span><span style="background: #7c3aed" class="seed"></span><span style="background: #612bbc"></span><span style="background: #47218c"></span><span style="background: #311a5f"></span></div>
<div class="ramp"><code>violet</code><span style="background: oklch(96.9% 0.016 293.756)"></span><span style="background: oklch(94.3% 0.029 294.588)"></span><span style="background: oklch(89.4% 0.057 293.283)"></span><span style="background: oklch(81.1% 0.111 293.571)"></span><span style="background: oklch(70.2% 0.183 293.541)"></span><span style="background: oklch(60.6% 0.25 292.717)"></span><span style="background: oklch(54.1% 0.281 293.009)"></span><span style="background: oklch(49.1% 0.27 292.581)"></span><span style="background: oklch(43.2% 0.232 292.759)"></span><span style="background: oklch(38% 0.189 293.745)"></span><span style="background: oklch(28.3% 0.141 291.089)"></span></div>
</div>
<div class="ramp-pair">
<div class="ramp"><code>#0ea5e9</code><span style="background: #f0f9ff"></span><span style="background: #dff2ff"></span><span style="background: #c1e6ff"></span><span style="background: #8fd2fd"></span><span style="background: #51bcfa"></span><span style="background: #0ea5e9" class="seed"></span><span style="background: #008bc6"></span><span style="background: #0072a4"></span><span style="background: #005b83"></span><span style="background: #004565"></span><span style="background: #053046"></span></div>
<div class="ramp"><code>sky</code><span style="background: oklch(97.7% 0.013 236.62)"></span><span style="background: oklch(95.1% 0.026 236.824)"></span><span style="background: oklch(90.1% 0.058 230.902)"></span><span style="background: oklch(82.8% 0.111 230.318)"></span><span style="background: oklch(74.6% 0.16 232.661)"></span><span style="background: oklch(68.5% 0.169 237.323)"></span><span style="background: oklch(58.8% 0.158 241.966)"></span><span style="background: oklch(50% 0.134 242.749)"></span><span style="background: oklch(44.3% 0.11 240.79)"></span><span style="background: oklch(39.1% 0.09 240.876)"></span><span style="background: oklch(29.3% 0.066 243.157)"></span></div>
</div>
<div class="ramp-pair">
<div class="ramp"><code>#c2410c</code><span style="background: #fff5f2"></span><span style="background: #ffeae3"></span><span style="background: #ffd5c8"></span><span style="background: #ffb49c"></span><span style="background: #ff8c67"></span><span style="background: #fa5e26"></span><span style="background: #df4b0b"></span><span style="background: #c2410c" class="seed"></span><span style="background: #972f03"></span><span style="background: #6f2205"></span><span style="background: #4c1a09"></span></div>
<div class="ramp"><code>orange</code><span style="background: oklch(98% 0.016 73.684)"></span><span style="background: oklch(95.4% 0.038 75.164)"></span><span style="background: oklch(90.1% 0.076 70.697)"></span><span style="background: oklch(83.7% 0.128 66.29)"></span><span style="background: oklch(75% 0.183 55.934)"></span><span style="background: oklch(70.5% 0.213 47.604)"></span><span style="background: oklch(64.6% 0.222 41.116)"></span><span style="background: oklch(55.3% 0.195 38.402)"></span><span style="background: oklch(47% 0.157 37.304)"></span><span style="background: oklch(40.8% 0.123 38.172)"></span><span style="background: oklch(26.6% 0.079 36.259)"></span></div>
</div>
<div class="ramp-pair">
<div class="ramp"><code>#0d9488</code><span style="background: #f1f9f8"></span><span style="background: #e0f4f0"></span><span style="background: #c4e9e3"></span><span style="background: #98d8ce"></span><span style="background: #60c4b8"></span><span style="background: #31ada0"></span><span style="background: #0d9488" class="seed"></span><span style="background: #007b70"></span><span style="background: #02625a"></span><span style="background: #094a44"></span><span style="background: #0c332f"></span></div>
<div class="ramp"><code>teal</code><span style="background: oklch(98.4% 0.014 180.72)"></span><span style="background: oklch(95.3% 0.051 180.801)"></span><span style="background: oklch(91% 0.096 180.426)"></span><span style="background: oklch(85.5% 0.138 181.071)"></span><span style="background: oklch(77.7% 0.152 181.912)"></span><span style="background: oklch(70.4% 0.14 182.503)"></span><span style="background: oklch(60% 0.118 184.704)"></span><span style="background: oklch(51.1% 0.096 186.391)"></span><span style="background: oklch(43.7% 0.078 188.216)"></span><span style="background: oklch(38.6% 0.063 188.416)"></span><span style="background: oklch(27.7% 0.046 192.524)"></span></div>
</div>

And the numbers: the largest difference between the two ramps, as ΔE OK times 100 (about 2 is the smallest a viewer
tells apart), and the contrast of white text on 600 and 700, where `v-solid` puts it, for the seed's palette and for
Tailwind's:

| Seed | Anchor | Nearest | Largest ΔE | White on 600 | White on 700 |
| --- | --- | --- | --- | --- | --- |
| `#f5b301` | 300 | yellow | 12.3 | 3.97 / 2.93 | 5.51 / 4.92 |
| `#2563eb` | 700 | blue | 7.4 | 3.95 / 5.26 | 5.17 / 6.82 |
| `#e11d48` | 600 | rose | 6.8 | 4.70 / 4.51 | 6.18 / 6.06 |
| `#16a34a` | 600 | green | 6.2 | 3.30 / 3.22 | 4.88 / 4.94 |
| `#7c3aed` | 700 | violet | 9.7 | 4.24 / 5.88 | 5.70 / 7.29 |
| `#0ea5e9` | 500 | sky | 3.3 | 3.81 / 4.02 | 5.33 / 5.85 |
| `#c2410c` | 700 | orange | 6.3 | 4.08 / 3.59 | 5.18 / 5.23 |
| `#0d9488` | 600 | teal | 7.4 | 3.74 / 3.66 | 5.16 / 5.39 |

A seed anchored at 700, a shade darker than in Tailwind, gives a lighter 600: white on it no longer passes 4.5:1.
Give the `anchor`, or check the pair with `contrast` as above.

### From an existing palette

`{ palette }` and `{ shades }` without `adjust` and `pins` are returned byte for byte, so a named palette never
shifts. With either, the ramp is first fitted to curves, one cubic bezier per channel, and then sampled. The fit is
close but not exact. The largest difference between a Tailwind palette and the same palette fitted and sampled, as
ΔE OK times 100:

| Palettes | Largest ΔE |
| --- | --- |
| Tailwind 4, chromatic | 2.0 (cyan) to 3.4 (rose); blue 2.1, red 3.2, yellow 3.3 |
| Tailwind 4, grays | 1.0 (slate) to 1.5 (stone, mauve) |
| Tailwind 3, chromatic | 1.4 (orange) to 3.4 (rose); blue 2.0, red 3.1, yellow 3.2 |
| Tailwind 3, grays | 1.1 (zinc) to 1.5 (neutral) |

The Tailwind 4 figures include the reduction into sRGB: some of its shades are outside it. The test that measures
them keeps every palette's figure in a snapshot.

### Store the recipe

A spec is plain JSON, under 1 KB with curves and 11 pins. A theme editor can save it and open it again with its
sliders, curves and pins as they were. `parsePalette` validates a spec from outside, such as a request body or a
saved theme, and throws with the path of the first field that is wrong:

```ts
import { parsePalette } from '@windi-ui/core/theme';

const spec = parsePalette(JSON.parse(body));
// WindiUI: invalid palette spec at `adjust.contrast`: must be an integer from -50 to 50.
```

To edit the curves of a palette, `fitPalette` gives them for any ramp, `adjustCurves` applies an adjustment, and
`samplePalette` gives the shades:

```ts
const curves = fitPalette(tailwind4.blue); // { lightness, chroma, hue }, each { y0, y1, p1x, p1y, p2x, p2y }
samplePalette(adjustCurves(curves, { hue: 20 }), { 500: '#3b82f6' });
```

::: warning The shades are part of the API
The shades a spec gives are kept from one release to the next: a test fixes them for a set of specs, and changing
them is a breaking release. A theme that stores a `seed`, an `adjust` or `curves` keeps its colors across upgrades.
:::

### In the build

The builder's [`addColor` and `setColor`](/reference/builder#colors) take a spec too, and resolve it at build time
to literal shades, over the palettes of the theme:

```ts
build(b) {
	b.addColor('brand', { seed: '#2563eb' })
	 .addColor('muted-blue', { palette: 'blue', adjust: { saturation: -20 } });
}
```

### Not in this version

Left out on purpose. Each would be a new base key or option, with no change to the specs that exist:

- Named palettes of your own shared between specs, beyond the `palettes` you pass.
- A ramp per mode. Dark mode uses other shades of the same ramp, which is what a variant's `dark` values and its
  per-color overrides choose.
- Ramps of more than 11 shades.

## Calibrate contrast

A [per-color override](/guide/customizing#override-a-variant-for-some-colors) fixes a color that needs other shades,
but someone has to know which colors those are. For Tailwind's palettes the list is short; for a palette an end user
picks, or one generated from a brand color, nobody can write it by hand. `calibrate` computes it:

```ts
const { overrides, report } = engine.calibrate({ primary: 'yellow' }, { text: 4.5 });

overrides.solid;   // { primary: { bg: '700', pseudos: { ':hover': { bg: '800' } } } }
overrides.outline; // { primary: { fg: '700' } }
report[0];         // { variant: 'solid', color: 'primary', mode: 'light', state: 'rest', strategy: 'shift-bg', contrast: { text: 4.92 } }
```

The first argument names the colors: an array of colors of the engine, such as `engine.colors()`, or an object that
maps a name to a color of the engine, to 11 shades or to a [palette spec](#build-palettes). The result is in the
shape of the [`overrides`](/reference/options#overrides) option, so it goes straight into a config, and it holds only
the differences: a color that passes already gets no override.

For each variant and color, in light and dark mode, at rest and on hover, it checks the pairs of the policy, and
only those it gives:

- `text`: `fg` on `bg`. A translucent background is painted over a backdrop first, `white` in light mode and
  `default-950` in dark; `backdrops: { light: ['white', 'default-100'] }` checks over each color you list. A pair
  that needs a backdrop that is not a literal color, such as `default-950` of a `default` given by CSS variables, is
  not checked unless you list one.
- `border`: a visible `border` against the backdrop. A border with opacity 0, such as the one of `v-solid`, is not
  checked.
- `metric`: the contrast function. It is WCAG 2 unless the policy or the engine gives another, such as APCA, with
  thresholds of its own.

A pair that fails is repaired with a strategy:

| Strategy | Repairs a failing pair by |
| --- | --- |
| `'shift-bg'` (default) | Walking its offending shade, the one of `fg` and a visible `bg` nearer to 500, away from the other color: darker under light text or on a light backdrop, lighter otherwise, until it passes, or the other one when it cannot, such as a faint background. A border walks away from the backdrop. |
| `'flip-fg'` | Keeping the background and switching `fg` (or the border) to 950 or black, or to 50 or white, whichever passes first. With WCAG 2 it passes for any ramp. |
| `'anchor-seed'` | For a `seed` spec, keeping the seed's own shade as the background and fitting `fg` around it. It only repairs a pair whose offending shade is the background, and lets the next strategy try the others. |
| A function | What it returns. See [Strategies of your own](#strategies-of-your-own). |
| A list | Each in order, until one passes: `['shift-bg', 'flip-fg']` rejects nothing. |

```ts
engine.calibrate(engine.colors(), { text: 4.5, border: 3 }, { strategy: ['shift-bg', 'flip-fg'] });
engine.calibrate({ primary: { seed: '#f5b301' } }, { text: 4.5 }, { strategy: ['anchor-seed', 'shift-bg'] });
// solid: { primary: { bg: '300', fg: '950', pseudos: { ':hover': { bg: '400', fg: '950' } } } }
```

How the result is built:

- It only ever chooses shades. It never changes a color of the ramp, so a pinned shade stays pinned.
- A hover shade of its own moves with its shade at rest, so the state keeps its offset: `bg` 600 to 700 takes the
  hover 700 to 800. A hover value that refers to the value at rest follows it anyway, and one that plays another
  part, such as `fg` 50 on hover where `fg` is 600 at rest, stays.
- Dark mode is calibrated on its own, after light: a light override that also applies in dark is checked there, and
  a dark value is only added where dark still fails.
- An override of the config wins. A value it sets is never changed, in dark mode too where the variant has no dark
  value of its own, so a pair it keeps below the policy is reported, not repaired.
- `report` lists each cell that failed, before calibration or after a fix to another cell, with the `strategy` that
  made it pass, by name, and its contrast after. A cell no strategy could repair has no `strategy`.

With Tailwind's palettes and `{ text: 4.5 }`, the default strategy makes every pair of the built-in and the
`nuxt-ui` variants pass, light and dark, at rest and on hover. `v-solid` changes for the nine palettes where white
on 600 fails, to 700 and 800 on hover, and for no other.

### Strategies of your own

A function gets the failing cell and returns the shades for its `bg`, `fg` or `border`, or nothing when it cannot
repair it. `failing(fix)` gives the checks the cell still fails with a fix applied:

```ts
import type { CalibrationStrategyFunction } from '@windi-ui/core/theme';

const black: CalibrationStrategyFunction = cell => cell.failing({ fg: 'black' }).length ? undefined : { fg: 'black' };
engine.calibrate(engine.colors(), { text: 4.5 }, { strategy: ['shift-bg', black] });
```

The cell also has its `variant`, `color`, `mode`, `state`, its resolved `values`, the `palette` and, for a seed,
its `anchor`. The report names the function by its name.

### In the build

`calibrate(policy, options?)` on the builder fills the overrides of the build's own palettes at build time:

```ts
build(b) {
	b.calibrate({ text: 4.5 });
}
```

It runs once the build is done, after `build`, the presets and the [`overrides`](/reference/options#overrides)
option, wherever it is called, over every color with a class and literal shades. A palette given by CSS variables
is left out: its colors are only known at runtime, where the engine calibrates it. Explicit overrides win, as above,
and a pair it cannot repair is logged.

## Theme documents

Runtime theming needs one description of a theme that a server, a theme editor and an email renderer all read. A
**theme document** is that description, as plain JSON:

```json
{
	"version": 1,
	"colors": {
		"primary": { "seed": "#2563eb" },
		"default": { "palette": "slate" },
		"secondary": { "palette": "blue", "adjust": { "saturation": -20, "hue": 8 } }
	},
	"radius": "0.25rem",
	"overrides": { "solid": { "primary": { "bg": "700" } } }
}
```

- `version` is `1`, the only version so far.
- `colors` has a [palette spec](#build-palettes) for each color.
- `radius` is a length in `px`, `rem` or `em`. `toCss` writes it as `--wui-radius` (with your
  [`prefix`](/reference/options#prefix)). Nothing in WindiUI reads it; your own CSS can, such as
  `rounded-(--wui-radius)`.
- `overrides` has the shape of the [`overrides`](/reference/options#overrides) option, with shades as values:
  `'700'`, `'accent-600'`, `'white'`, and opacities such as `'0.5'`.

A gallery of presets is a list of such files, and import, export or a link that shares a theme are a
`JSON.stringify` away. The library does not narrow the document; a theme editor can expose less of it.

### Validate a document

`parseTheme` checks a document from outside, such as a request body or a saved theme, against the engine, and
returns a copy. It throws with the path of the first field that is wrong:

```ts
const theme = engine.parseTheme(JSON.parse(body));
// WindiUI: invalid theme at `overrides.solid.primary.bg`: must be a shade, such as `700`, `accent-600` or `white`.
```

It checks the `version`, each palette spec as [`parsePalette`](#store-the-recipe) does, the variants of `overrides`
against the engine's, their props and their values, and rejects a key it does not know. `toCss` and `toStatic`
validate the document they get as well.

### Write the CSS

`toCss` turns a document into CSS variables, for the colors your config gives by
[`vars`](/guide/colors#palettes-that-change-at-runtime):

```ts [windiui.config.ts]
export default defineConfig({
	default: { vars: '--ui-color-default' },
	build: b => b
		.addColor('primary', { vars: '--ui-color-primary', overrideVars: {} })
		.addColor('secondary', { vars: '--ui-color-secondary' }),
});
```

```ts
engine.toCss(theme, { darkSelector: '.dark' });
```

```css
:root {
  --wui-radius: 0.25rem;
  --ui-color-default-50: oklch(98.4% 0.003 247.858);
  /* ... */
  --ui-color-primary-50: #f4f8ff;
  /* ... */
  --ui-color-primary-950: #0f285d;
  --ui-color-primary-solid-bg: var(--ui-color-primary-700);
  --ui-color-secondary-50: #f2f6fd;
  /* ... */
}
```

- Each color of the document gets its 11 shades. A color that the config does not give by `vars` throws: there is
  no variable to write.
- Each color that the config gives with [`overrideVars`](/guide/colors#variant-overrides-at-runtime) gets the
  override variables it forwards, where the document's overrides change what the build paints. A value that no
  variable carries, of a variant or a prop the color does not forward, cannot reach the CSS and is left out; use
  [`toStatic`](#literal-colors) or forward it.
- The document's overrides win over the config's, as a variable set at runtime wins over a static override.
- Dark mode has a block of its own where a value differs: with `darkSelector: '.dark'`, it is
  `:root:where(.dark, .dark *)`. The block always compounds the selector with the dark selector, because
  `:where(.dark, .dark *)` alone has no specificity, so `<html class="dark">` would keep the light value. Left out,
  dark mode is the `prefers-color-scheme` media query.
- The output only holds values the engine writes. Every color of the document is read and written again, so a string
  of the document never reaches the CSS as it was, and the same document always gives the same CSS.

| Option | Default | Description |
| --- | --- | --- |
| `selector` | `':root'` | Where the variables are declared; a list too. |
| `darkSelector` | `'media'` | A selector such as `'.dark'`, compounded with `selector`, or `'media'`. |
| `reset` | `false` | Writes `initial` for every override variable it does not set, so that a scope does not take the page's. |
| `always` | `[]` | Override variables written even where they equal the variant's shade, as `'variant.prop'`: `['solid.bg', 'outline.fg']`, for CSS of your own that reads them. |
| `calibrate` | none | A [calibration](#calibrate-contrast) policy, with `strategy`. It runs on the colors of the document first, and the document's overrides win over its result. |
| `channels` | `false` | Writes each shade as RGB channels, `37 99 235`, which is what the variables of a palette hold on Tailwind 3. |

On the server, render the CSS into the page:

```ts
const css = engine.toCss(engine.parseTheme(tenant.theme), { darkSelector: '.dark', calibrate: { text: 4.5 } });
const head = `<style id="theme">${css}</style>`;
```

### Preview a theme in a scope

A theme editor previews a draft inside the page, next to the page's own theme. Write it on the preview container,
with `reset` so that an override of the page theme does not reach into it:

```ts
preview.textContent = engine.toCss(draft, { selector: '[data-theme-preview]', darkSelector: '.dark', reset: true });
```

```html
<div data-theme-preview>
	<button class="btn c-primary v-solid">Save</button>
</div>
```

With a `default` or `accent` given by `vars`, name the container in
[`rootSelector`](/reference/options#rootselector) too, so that WindiUI's root variables are declared again from the
draft's shades.

### Literal colors

An email client does not support CSS variables. `toStatic` gives the literal colors of a theme instead, as hex, for
every color, variant, mode, state and color property:

```ts
const colors = engine.toStatic(theme);

colors.primary.solid.light.rest.bg;   // '#2563eb', shade 700 by the document's override
colors.primary.solid.light.hover.fg;  // '#f4f8ff'
colors.primary.outline.light.rest.bg; // '#ffffff': opacity 0, painted over the backdrop
```

- Each color of the engine with literal shades is there, with the document's palette where it gives one, and each
  color of the document. A palette given by `vars` that the document leaves out has no literal colors and is left
  out.
- A color with an opacity is painted over the backdrop, `white` in light mode and `default-950` in dark, or the
  `backdrop` you give: `{ backdrop: { light: '#f8fafc' } }`. Text and borders are painted over the background, which
  a browser paints under the border too.
- `calibrate` calibrates the colors of the document first, as with `toCss`, so the email matches the page.

## Where it runs

The entry has an ES module and a CommonJS build, and imports nothing from Tailwind or `node:*`. Bundled for a browser,
it is about 47 kB minified and 16 kB gzipped; the two palette tables add 16 kB, 4 kB gzipped, when imported. Node runs
it without flags.

See the [theme engine reference](/reference/theme-engine) for every function and type.
