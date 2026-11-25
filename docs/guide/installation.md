# Installation

## Requirements

- Node.js 22 or higher. A [config file](/reference/config-file#node-js) needs 22.12 or higher.
- Tailwind CSS v3 (3.3 or higher) or v4.

The tests run on Node.js 26 with Tailwind CSS 3.4, 4.1.16 and the current 4.3. On Tailwind v4 below 4.1.17, dark
mode needs [`darkSelector`](/guide/dark-mode#tailwind-v4) to follow a `@custom-variant dark`.

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

Load WindiUI from your stylesheet with `@plugin`. There are four forms; pick the first one that covers what
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

**A config file.** All options, the [builder API](/guide/customizing) included, in a `windiui.config.ts`
that exports them with `defineConfig`. The first two forms find it from the working directory, and so do
tools that read the same config:

::: code-group

```css [main.css]
@import "tailwindcss";
@plugin "@windi-ui/tailwind";
```

```ts [windiui.config.ts]
import { defineConfig } from '@windi-ui/tailwind';

export default defineConfig({
	build(builder) {
		// ...
	}
});
```

:::

Tailwind does not watch a config file: an edit applies on the next full rebuild. To change `build` while the
dev server runs, use a plugin module. See [Rebuilds](/reference/config-file#rebuilds).

**A plugin module.** The plugin, configured in a `windiui.plugin.ts` of your own, and `@plugin` points at it.
The path is relative to the stylesheet, and Tailwind rebuilds when the module changes. Use it in a monorepo or
a layered app, where the working directory can be the wrong place to search from:

::: code-group

```css [main.css]
@import "tailwindcss";
@plugin "./windiui.plugin.ts";
```

```ts [windiui.plugin.ts]
import windiui from '@windi-ui/tailwind';

export default windiui({
	build(builder) {
		// ...
	}
});
```

:::

Keep the two names apart: `windiui.config.ts` exports options, `windiui.plugin.ts` exports the plugin. See
[Config file and plugin module](/reference/config-file) for when to use which, the lookup rules and the limits.

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

`windiui()` also reads a [config file](/reference/config-file#config-file), and `plugins` takes a
[plugin module](/reference/config-file#plugin-module) as well. `@windi-ui/tailwind/v3` is the same plugin, always
building for Tailwind v3, for a setup where the automatic choice is wrong; see
[Entry points](/reference/options#entry-points).

In CommonJS, `require('@windi-ui/tailwind')` is the plugin and also carries the helpers:
`const { safelistSource } = require('@windi-ui/tailwind');`.

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
