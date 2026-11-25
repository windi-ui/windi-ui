<p align="center">
	<img src="https://raw.githubusercontent.com/windi-ui/windi-ui/main/docs/public/logo-lockup.svg" alt="WindiUI" width="306">
</p>

# WindiUI

🚧 under development 🚧

WindiUI is a modern, modular, and customizable UI component library designed to work seamlessly with Tailwind CSS. It provides developers with a set of reusable components and utilities to build beautiful and consistent user interfaces efficiently.

## Features

- **Core Components**: A collection of essential UI components such as buttons, badges, and cards.
- **Tailwind Integration**: Utilities and themes tailored for Tailwind CSS.
- **Customizable**: Easily extend and modify components to fit your design system.
- **Extensible**: Build your own components and variants with advanced utilities.
- **Dark mode**: Automatically detect your dark mode config and apply appropriate style.

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- Tailwind v3/v4

### Installation

```bash
npm install -D @windi-ui/tailwind
```

On Tailwind v4, load it from your stylesheet:

```css
@import "tailwindcss";
@plugin "@windi-ui/tailwind";
```

Options go in the `@plugin` block, in a `windiui.config.ts` config file that exports them with `defineConfig`, or in
a `windiui.plugin.ts` plugin module that exports `windiui({ ... })` and is loaded with `@plugin "./windiui.plugin.ts"`;
see [Installation](https://windi-ui.github.io/windi-ui/guide/installation) and [Config file and plugin module](https://windi-ui.github.io/windi-ui/reference/config-file).

On Tailwind v3, add the plugin to your `tailwind.config.ts` / `tailwind.config.js` file:

```ts
import type { Config } from 'tailwindcss';
import windiui from '@windi-ui/tailwind';

export default {
	// ...
	plugins: [
		windiui()
	],
} satisfies Config;
```

### Usage

#### Colors

WindiUI automatically detect all the colors in your theme and make them available to be used with components and utility classes.

First you choose the color you want with `c-*` (e.g. `c-blue`, ...), then apply it with Tailwind class (e.g. `bg-c-800`, ...)

```html
<div class="c-blue bg-c-800/50 text-c-300 border border-c-500 p-5">Hello World</div>
```

#### Variants

Make your component more flexible by styling it with variant utilities classes, use (`bg-v`, `text-v`, `border-v`, ...) to apply the colors, then use `v-*` to change the style, WindiUI has the following built-in variants styles: `v-default`,  `v-solid`,  `v-outline`,  `v-light`.

```html
<span class="inline-block c-red v-solid bg-v-soft/60 text-v border border-v py-1 px-2 rounded">Test</span>
```

A variant can use other shades for some colors, for example a darker `solid` background for yellow, where white text on shade 600 is hard to read:

```ts
windiui({
	build: (builder) => builder.overrideVariant('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } }),
});
```

See [Override a variant for some colors](https://windi-ui.github.io/windi-ui/guide/customizing#override-a-variant-for-some-colors).

More variants come from presets. The `nuxt-ui` preset adds `v-soft`, `v-subtle`, `v-ghost` and `v-link`, whose text reaches a contrast of 4.5:1 with every palette of Tailwind's default theme:

```ts
windiui({ presets: ['nuxt-ui'] });
```

See [Presets](https://windi-ui.github.io/windi-ui/guide/presets).

#### Components

WindiUI comes with a few built-in components (e.g. `btn`, `badge`, ... more to come) that can be styled with `c-*`, `v-*` utilities, some components also support `s-*` utility to control its size.

```html
<button class="btn v-light c-blue s-lg">
	Primary
	<span class="badge v-solid c-red leading-none rounded-full absolute top-0 start-full -translate-1/2">32</span>
</button>
```

You can find more code examples in the [playground](https://github.com/windi-ui/windi-ui/blob/main/playground/vue-tailwindv4/src/App.vue).

#### Variants in your own CSS

`apply-v` paints the background, border and text from the current variant, at rest and on hover, as `btn` does. It works as a class and under `@apply`, and carries the default variant as a fallback, so it is the supported way to read a variant in a stylesheet. A list in brackets chooses the properties and the states:

```css
.card-action { @apply apply-v; }                                          /* bg, border, text + :hover */
.chip        { @apply apply-v-[bg,text]; }                                /* chosen properties */
.hint        { @apply apply-v-[bg-muted,text-muted]; }                    /* other levels */
.tab         { @apply apply-v-[hover,focus-visible,active,disabled]; }    /* chosen states */
```

The `variantUtilities` option adds color shortcuts painted from a variant, such as `bg-primary` with the `solid` background of `primary`, its overrides and dark values included:

```ts
windiui({ variantUtilities: { bg: 'solid', text: 'outline', border: 'outline' } });
```

Tailwind's own utilities keep precedence: a single-value color such as `bg-white`, a palette with a `DEFAULT`, and arbitrary values such as `bg-[#123456]` are left to Tailwind. See [Utilities](https://windi-ui.github.io/windi-ui/guide/utilities#apply-v).

#### Sizes

`s-xs`, `s-sm`, `s-md` (the default size, also `s-default`), `s-lg` and `s-xl` set these variables, which `:root` sets to the default size:

| Variable | Meaning |
| --- | --- |
| `--wui-s-spacing-1`, `-1\.5`, `-2`, `-3`, `-4` | Spacing slots |
| `--wui-s-text`, `--wui-s-line-height` | Font size and line height |

A size can carry keys of your own, such as `builder.updateSize('sm', (s) => ({ ...s, height: '2rem' }))` for `--wui-s-height`. See [Sizes](https://windi-ui.github.io/windi-ui/guide/sizes).

#### Class names built at runtime

Tailwind only emits the classes it finds in your source. A class built at runtime, such as `c-${color}` from a
component prop, has to be safelisted.

On Tailwind v4, add one line to the stylesheet. `safelistSource()` returns the string for your config:

```css
@source inline("{c-{accent,accent-accent,accent-blue,accent-default,accent-red,blue,default,red},v-{default,light,outline,solid},s-{default,lg,md,sm,xl,xs}}");
```

```ts
import { safelistSource } from '@windi-ui/tailwind';

safelistSource({}, { palettes: ['blue', 'red'] }); // the string above; without `palettes`, every palette of the default theme
```

On Tailwind v3, `windiui({ safelist: true })` emits every `c-*`, `v-*` and `s-*` class.

See [the `safelist` option](https://windi-ui.github.io/windi-ui/reference/options#safelist) for the details.

## Upgrading from 0.7

See [Changes in 0.8](https://windi-ui.github.io/windi-ui/changes-0.8). The one thing to check: 0.8 no longer sets the default variant on every
element with a `*` rule (the new `variantScope` option, default `'element'`). `btn`, `badge` and the `bg-v`,
`text-v`, `border-v` utilities look the same, but your own CSS that reads a variant variable directly, such as
`background: var(--wui-v-bg)`, on an element without a `v-*` class no longer gets a value. Either set
`windiui({ variantScope: 'universal' })` to keep the 0.7 output, or give the rule a variant with
`@apply v-default v-scope`. A rule that uses `@apply v-*` should also apply `v-scope`, so its children do not
inherit the variant.

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
