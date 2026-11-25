# Installation

## Requirements

- Node.js 22 or higher
- Tailwind CSS v3 (3.3 or higher) or v4

## Install

::: code-group

```bash [npm]
npm install -D @windi-ui/tailwind
```

```bash [pnpm]
pnpm add -D @windi-ui/tailwind
```

```bash [yarn]
yarn add -D @windi-ui/tailwind
```

:::

The package is published as both ESM and CommonJS.

## Tailwind CSS v4

Load WindiUI from your stylesheet with `@plugin`. There are three forms; pick the first one that covers what
you need.

**Zero config.** The built-in colors, variants, sizes and components:

```css [main.css]
@import "tailwindcss";
@plugin "@windi-ui/tailwind";
```

**Options in the stylesheet.** The [options](/reference/options) that are plain values, with their names in
kebab-case:

```css [main.css]
@import "tailwindcss";
@plugin "@windi-ui/tailwind" {
	prefix: app;
	variant-scope: inherit;
}
```

**A config module.** For the [builder API](/guide/customizing), point `@plugin` at a module of your own that
exports the configured plugin. The path is relative to the stylesheet, and Tailwind rebuilds when the module
changes:

::: code-group

```css [main.css]
@import "tailwindcss";
@plugin "./windiui.config.ts";
```

```ts [windiui.config.ts]
import windiui from '@windi-ui/tailwind';

export default windiui({
	build(builder) {
		// ...
	}
});
```

:::

With the first two forms WindiUI also looks for a `windiui.config.*` file by itself. See
[Config file](/reference/config-file) for the lookup rules and its limits.

### In a JavaScript config

A Tailwind config loaded with `@config` keeps working. Import from `@windi-ui/tailwind/v4` there: it is the
same plugin, typed for Tailwind v4's `Config`.

::: code-group

```ts [tailwind.config.ts]
import type { Config } from 'tailwindcss';
import windiui from '@windi-ui/tailwind/v4';

export default {
	plugins: [
		windiui()
	],
} satisfies Config;
```

```css [main.css]
@import "tailwindcss";
@config "../tailwind.config.ts";
```

:::

## Tailwind CSS v3

Add the plugin to your Tailwind config:

::: code-group

```ts [tailwind.config.ts]
import type { Config } from 'tailwindcss';
import windiui from '@windi-ui/tailwind';

export default {
	content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	plugins: [
		windiui()
	],
} satisfies Config;
```

```js [tailwind.config.cjs]
module.exports = {
	content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	plugins: [
		require('@windi-ui/tailwind')()
	],
};
```

:::

## Try it

```html
<button class="btn v-solid c-blue">Save</button>
```

<Demo>
<button class="btn v-solid c-blue">Save</button>
</Demo>

## Known limitations

- **Types on Tailwind v4.** The default entry is typed against Tailwind v3, so v4's `Config` type rejects
  `windiui()` from it. Import from `@windi-ui/tailwind/v4` in a v4 JavaScript config.
- **Preflight.** `btn` sets a border width but relies on Tailwind's preflight for `border-style: solid`.
  If you disable preflight, add the border style yourself.
