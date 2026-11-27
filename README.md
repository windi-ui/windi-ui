<p align="center">
	<img src="https://raw.githubusercontent.com/windi-ui/windi-ui/main/docs/public/logo-lockup.svg" alt="WindiUI" width="306">
</p>

# WindiUI

🚧 under development 🚧

WindiUI is a Tailwind CSS plugin that adds three axes to your classes: a color (`c-*`), a variant (`v-*`) and a size
(`s-*`). Each one is a class that sets CSS variables, so `btn c-blue v-solid s-lg` is a large, solid, blue button, and
the same `btn` takes every palette of your theme, in light and dark mode.

**[Documentation](https://windi-ui.github.io/windi-ui/guide/introduction)** ·
[Installation](https://windi-ui.github.io/windi-ui/guide/installation) ·
[Options](https://windi-ui.github.io/windi-ui/reference/options) ·
[Builder API](https://windi-ui.github.io/windi-ui/reference/builder) ·
[Changes in 0.8](https://windi-ui.github.io/windi-ui/changes-0.8)

## Features

- **Three axes.** `c-*` picks one of your palettes, `v-*` a variant and `s-*` a size. They combine freely, and colors
  and sizes inherit down the tree.
- **Calibrated variants.** `default`, `solid`, `outline` and `light` pick shades of the 11-shade palette for the
  background, border and text, with soft, muted and accent levels, a hover state and dark values. A variant can use
  other shades for some colors, such as a darker `solid` yellow.
- **Presets.** `nuxt-ui` adds `soft`, `subtle`, `ghost` and `link`, with text that passes a contrast of 4.5:1.
- **Components and utilities.** `btn`, `badge`, `bg-v`, `text-v`, `border-v`, and `apply-v` for your own CSS.
- **Builder API.** Add, replace, change or remove colors, variants, sizes and components.
- **Runtime palettes.** A color given by CSS variables follows a theme set at runtime.
- **Dark mode.** Follows the dark variant of your Tailwind setup, with nothing to configure.
- **Tailwind v3 and v4**, with the same class names.

## Getting Started

### Prerequisites

- Node.js 22 or higher, or 22.12 or higher to load a
  [config file](https://windi-ui.github.io/windi-ui/reference/config-file). The tests run on Node.js 26.
- Tailwind CSS v3.3 or higher, or v4. The tests run on Tailwind CSS 3.4, 4.1.16 and the current 4.3.

### Installation

```bash
npm install -D @windi-ui/tailwind
```

On Tailwind v4, load it from your stylesheet:

```css
@import "tailwindcss";
@plugin "@windi-ui/tailwind";
```

On Tailwind v3, add it to the plugins of your Tailwind config:

```ts
import type { Config } from 'tailwindcss';
import windiui from '@windi-ui/tailwind';

export default {
	content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	plugins: [windiui()],
} satisfies Config;
```

Options go in the `@plugin` block, in a `windiui.config.ts` config file, or in a plugin module; see
[Installation](https://windi-ui.github.io/windi-ui/guide/installation) and
[Options](https://windi-ui.github.io/windi-ui/reference/options).

### Usage

```html
<button class="btn c-blue v-solid">Save</button>
<button class="btn c-red v-outline s-sm">Delete</button>
<button class="btn c-blue v-light s-lg">Inbox <span class="badge c-red v-solid">3</span></button>
<div class="c-green v-light bg-v text-v border border-v-muted rounded p-4">A box painted by its variant</div>
<div class="c-amber bg-c-100 text-c-800 p-4">Shades of the current color</div>
```

A plugin module configures WindiUI with the builder API. This one adds the `nuxt-ui` variants, gives `solid` a darker
background with yellow, and adds a `c-primary` color whose shades are CSS variables set at runtime:

```ts
// windiui.plugin.ts
import windiui from '@windi-ui/tailwind';

export default windiui({
	presets: ['nuxt-ui'],
	build: (builder) => builder
		.overrideVariant('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } })
		.addColor('primary', { vars: '--ui-color-primary' }),
});
```

```css
@import "tailwindcss";
@plugin "./windiui.plugin.ts";
```

```html
<button class="btn c-yellow v-solid">Solid yellow, on shade 700</button>
<button class="btn c-primary v-soft">Soft, in the runtime color</button>
```

The [guide](https://windi-ui.github.io/windi-ui/guide/introduction) covers each part, with live examples. The
[playground](https://github.com/windi-ui/windi-ui/blob/main/playground/vue-tailwindv4/src/App.vue) has more.

#### Variants and sizes in your own CSS

`apply-v` paints the background, border and text from the current variant, at rest and on hover, as `btn` does. A
list in brackets chooses the properties and the states. The `s-*` classes set size variables that a control of your
own can read:

```css
@import "tailwindcss";
@plugin "@windi-ui/tailwind";

.card-action { @apply apply-v; }                                  /* bg, border, text + :hover */
.tab         { @apply apply-v-[bg,text,hover,focus-visible]; }    /* chosen properties and states */
.my-input {                                                       /* as tall as a btn of the same size */
	padding: calc(var(--wui-s-spacing-1\.5) - 1px) calc(var(--wui-s-spacing-3) - 1px);
	border: 1px solid;
	font-size: var(--wui-s-text);
	line-height: var(--wui-s-line-height);
}
```

| Size variable | Meaning |
| --- | --- |
| `--wui-s-spacing-1`, `-1\.5`, `-2`, `-3`, `-4` | Spacing slots |
| `--wui-s-text`, `--wui-s-line-height` | Font size and line height |
| `--wui-s-<key>` | A key of your own on a size, such as `height` for an app that wants a fixed control height |

The `variantUtilities` option adds color utilities painted from a variant, such as `bg-yellow` with the `solid`
background of yellow, overrides and dark values included. See
[Utilities](https://windi-ui.github.io/windi-ui/guide/utilities) and
[Sizes](https://windi-ui.github.io/windi-ui/guide/sizes).

#### Runtime themes

The theme engine, `@windi-ui/core/theme`, turns a theme document, plain JSON, into the CSS variables of the colors
your config gives by `vars`, or into literal colors. It runs in Node, edge runtimes and browsers:

```js
import { createEngine } from '@windi-ui/core/theme';
import { tailwind4 } from '@windi-ui/tailwind/palettes';
import config from './windiui.config';

const engine = createEngine(config, { palettes: tailwind4 });
// Validated, with the path of the first field that is wrong; a theme from a database or a request is safe to render
const theme = engine.parseTheme({ version: 1, colors: { primary: { seed: '#2563eb' } }, overrides: { solid: { primary: { bg: '700' } } } });

// A server-rendered style tag, per brand or tenant
const head = `<style>${engine.toCss(theme, { darkSelector: '.dark' })}</style>`;

// A live preview of a draft in <div data-theme-preview>, which `reset` keeps from the page theme
previewStyle.textContent = engine.toCss(draft, { selector: '[data-theme-preview]', darkSelector: '.dark', reset: true });

// An email: literal hex for every color, variant, mode, state and property
const { bg, fg } = engine.toStatic(theme).primary.solid.light.rest;
```

See the [theme engine guide](https://windi-ui.github.io/windi-ui/guide/theme-engine#theme-documents).

#### Typed props and a manifest

The `manifest` option writes the names your config registers, for typed `color`, `variant` and `size` props, a
component gallery, a safelist or a lint rule, so none of them is a copy that drifts. It is off by default, and a file
is only written when its content changes, so a dev server does not rebuild in a loop:

```js
// windiui.config.js
export default {
	presets: ['nuxt-ui'],
	manifest: { json: './windiui.manifest.json', dts: './src/windiui.d.ts' },
};
```

```json
{
  "prefix": "wui",
  "colors": ["accent", "amber", "blue", "...", "zinc"],
  "variants": ["default", "solid", "outline", "light", "soft", "subtle", "ghost", "link"],
  "sizes": ["default", "md", "xs", "sm", "lg", "xl"],
  "components": ["btn", "badge"],
  "overrides": {}
}
```

The declaration file exports `WindiUIColor`, `WindiUIVariant` and `WindiUISize`, each a union of the names. Without a
build, `engine.manifest()` returns the same object, and `safelistSource(manifest)` the `@source inline()` line. See
[`manifest`](https://windi-ui.github.io/windi-ui/reference/options#manifest).

#### Contrast audit

`windiui audit` checks the contrast of every variant on every color of your config, light and dark, at rest and on
hover, with translucent backgrounds painted over the backdrop. It loads the config file the plugin loads, and exits
with 1 when a pair fails, so it can gate CI:

```bash
npx windiui audit --config ./windiui.config.ts --text 4.5 --border 3
npx windiui audit --palettes ./palettes.json --format json   # or table (default), markdown
npx windiui audit --fix   # prints the overrideVariant calls that calibration would add
```

```text
variant  color    mode   state  pair    ratio  result
solid    yellow   light  rest   fg/bg   2.93   FAIL (needs bg 700)
solid    blue     light  rest   fg/bg   5.25   ok
```

`--fix` prints calls such as `b.overrideVariant('solid', ['amber', 'yellow'], { bg: '700', pseudos: { ':hover': { bg: '800' } } });`,
ready to paste into `build`. `engine.audit(policy)` gives the same matrix to a test of your own. See
[Contrast audit](https://windi-ui.github.io/windi-ui/guide/contrast-audit).

## Upgrading from 0.7

See [Changes in 0.8](https://windi-ui.github.io/windi-ui/changes-0.8#upgrading-from-0-7). The one thing to check: 0.8
no longer sets the default variant on every element with a `*` rule (the new `variantScope` option, default
`'element'`). `btn`, `badge` and the `bg-v`, `text-v`, `border-v` utilities look the same, but your own CSS that
reads a variant variable directly, such as `background: var(--wui-v-bg)`, on an element without a `v-*` class no
longer gets a value. Either set `windiui({ variantScope: 'universal' })` to keep the 0.7 output, or give the rule a
variant with `@apply v-default v-scope`. A rule that uses `@apply v-*` should also apply `v-scope`, so its children
do not inherit the variant.

## Documentation

The full guide and reference are on [the docs site](https://windi-ui.github.io/windi-ui/guide/introduction), a VitePress site
in `docs/` with live examples.
Run it locally with `pnpm build && pnpm docs:dev`.

## Contributing

Contributions are welcome! Please submit issues or pull requests.

1. Clone the repository:

   ```bash
   git clone https://github.com/windi-ui/windi-ui.git
   cd windi-ui
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server for the playground:

   ```bash
   pnpm dev
   # or for Tailwind v4
   pnpm devv4
   ```

   The playgrounds use the built packages. To rebuild them on change, run `pnpm watch` in a second terminal.

### Tests

```bash
pnpm build       # the tests load the built packages
pnpm test        # run once
pnpm test -u     # rewrite the snapshots after an intended change in the output
```

The tests are in `test/` and run on Vitest.

- **Snapshots.** `test/__snapshots__/<fixture>/*.css` hold the CSS the plugin emits on each supported Tailwind:
  `tw3` (3.4, through PostCSS), `tw4.1` (the oldest supported v4, pinned below 4.1.17, where `@variant dark` is
  not expanded yet) and `tw4` (the current v4), both through Tailwind's `compile()`. Each is a package in
  `test/fixtures/` that pins its Tailwind version.
  A change in the output fails the test; if the change is intended, run `pnpm test -u` and commit the
  snapshot diff with the code, so the review shows what changed for users.
- **Browser.** `test/browser.test.ts` checks what a snapshot cannot: how the CSS cascades and inherits.
  It drives the Chrome or Edge already installed on the machine, and is skipped locally if there is neither.
- **README.** `test/readme.ts` compiles every TypeScript sample of this file on each fixture and every CSS sample
  on the Tailwind v4 ones, and checks that the classes of its HTML samples exist. Keep the samples compilable when
  you change them.
- A test file works with one fixture only, because the helper that loads a fixture changes the working directory.

### Project Structure

The repository is organized as a monorepo with the following packages:

#### Packages

- **`windiui-core`**: Contains the core components and utilities.
- **`windiui-tailwind`**: Tailwind CSS-specific utilities and themes.

#### Playgrounds

- **`vue-tailwind`**: A Vue 3 project showcasing WindiUI with Tailwind CSS v3.
- **`vue-tailwindv4`**: Another Vue 3 project demonstrating WindiUI with Tailwind CSS v4.

#### Tests

- **`test`**: The test harness, with one fixture package per supported Tailwind version in `test/fixtures`.

#### Docs

- **`docs`**: The VitePress documentation site (`pnpm docs:dev`, `pnpm docs:build`, `pnpm docs:preview`). It loads the built packages, so run `pnpm build` first.

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/windi-ui/windi-ui/blob/main/LICENSE) file for details.
