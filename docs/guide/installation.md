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

The default export is a function that takes the [options](/reference/options) and returns a Tailwind
plugin. The package is published as both ESM and CommonJS.

## Tailwind CSS v4

Today WindUI is loaded on v4 through a JavaScript config file referenced with `@config`.

```ts [tailwind.config.ts]
import type { Config } from 'tailwindcss';
import windui from '@windi-ui/tailwind';

export default {
	plugins: [
		// @ts-expect-error the plugin is typed against Tailwind v3
		windui()
	],
} satisfies Config;
```

```css [main.css]
@import "tailwindcss";
@config "../tailwind.config.ts";
```

::: info `@plugin` is not supported yet
`@plugin "@windi-ui/tailwind";` compiles but emits nothing, because the export is a plugin factory rather
than a plugin. Native `@plugin` loading with options is tracked in
[#33](https://github.com/windi-ui/windi-ui/issues/33).
:::

## Tailwind CSS v3

Add the plugin to your Tailwind config:

::: code-group

```ts [tailwind.config.ts]
import type { Config } from 'tailwindcss';
import windui from '@windi-ui/tailwind';

export default {
	content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	plugins: [
		windui()
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

- **Types on Tailwind v4.** The plugin's return type comes from Tailwind v3, so v4's `Config` type rejects it.
  It works at runtime; silence the error as shown above. A typed `/v4` entry point is tracked in
  [#33](https://github.com/windi-ui/windi-ui/issues/33).
- **Version detection.** The plugin reads the installed `tailwindcss` version to choose between its v3 and v4
  code paths. When it cannot (for example when the plugin is loaded as CommonJS), it logs
  `Unsupported Tailwind CSS version` and falls back to v3 behaviour.
  Tracked in [#32](https://github.com/windi-ui/windi-ui/issues/32).
- **Preflight.** `btn` sets a border width but relies on Tailwind's preflight for `border-style: solid`.
  If you disable preflight, add the border style yourself.
- **Every element gets the default variant.** The plugin adds a `*` rule that sets the `--wui-v-*` variables of
  the `default` variant on every element. Making that opt-in is tracked in
  [#31](https://github.com/windi-ui/windi-ui/issues/31).
