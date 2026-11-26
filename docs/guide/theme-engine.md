# Theme engine

The Tailwind plugin knows every palette, variant and override of your config, but only inside a Tailwind build.
The theme engine gives the same knowledge to code that runs anywhere else: a server that writes a `<style>` tag per
brand or tenant, a theme editor that previews in the browser, an email renderer that needs literal colors, or a test
that checks contrast.

It is `@windi-ui/core/theme`: plain TypeScript with no Tailwind, no DOM and no Node built-ins, which runs in Node,
edge runtimes and browsers. It runs your presets and `build` on the generators the plugin uses, so the two agree.

::: info New in 0.9
This is the first part of the theme engine. Palettes from a seed color, automatic contrast calibration and theme
documents build on it; see the [roadmap](https://github.com/windi-ui/windi-ui/issues/26).
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

## Where it runs

The entry has an ES module and a CommonJS build, and imports nothing from Tailwind or `node:*`. Bundled for a browser,
it is about 27 kB minified and 9 kB gzipped; the two palette tables add 16 kB, 4 kB gzipped, when imported. Node runs
it without flags.

See the [theme engine reference](/reference/theme-engine) for every function and type.
