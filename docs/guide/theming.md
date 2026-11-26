# Runtime theming

A palette of the Tailwind theme is fixed when the CSS is built. A palette given by CSS variables is not: WindiUI
writes `var()` references, and the page sets the variables later, from a `<style>` tag, a tenant's theme or a theme
editor. This page puts the pieces together.

<style>
.theme-teal {
	--ui-color-brand-50: #f0fdfa;
	--ui-color-brand-100: #ccfbf1;
	--ui-color-brand-200: #99f6e4;
	--ui-color-brand-300: #5eead4;
	--ui-color-brand-400: #2dd4bf;
	--ui-color-brand-500: #14b8a6;
	--ui-color-brand-600: #0d9488;
	--ui-color-brand-700: #0f766e;
	--ui-color-brand-800: #115e59;
	--ui-color-brand-900: #134e4a;
	--ui-color-brand-950: #042f2e;
}

.theme-rose {
	--ui-color-brand-50: #fff1f2;
	--ui-color-brand-100: #ffe4e6;
	--ui-color-brand-200: #fecdd3;
	--ui-color-brand-300: #fda4af;
	--ui-color-brand-400: #fb7185;
	--ui-color-brand-500: #f43f5e;
	--ui-color-brand-600: #e11d48;
	--ui-color-brand-700: #be123c;
	--ui-color-brand-800: #9f1239;
	--ui-color-brand-900: #881337;
	--ui-color-brand-950: #4c0519;
	--ui-color-brand-solid-bg: #9f1239;
	--ui-color-brand-solid-bg-hover: #881337;
}
</style>

<Demo class="theme-teal">
<button class="btn v-solid c-brand">Teal theme</button>
<button class="btn v-light c-brand">v-light</button>
<button class="btn v-outline c-brand">v-outline</button>
</Demo>
<Demo class="theme-rose">
<button class="btn v-solid c-brand">Rose theme, solid on 800</button>
<button class="btn v-light c-brand">v-light</button>
<button class="btn v-outline c-brand">v-outline</button>
</Demo>

The same `c-brand` class, in two containers that set different variables.

## Declare the palette

Add the palette with the [builder](/reference/builder#colors), in a [plugin module](/reference/config-file#plugin-module)
or a config file:

```ts [windiui.plugin.ts]
import windiui from '@windi-ui/tailwind';

export default windiui({
	build: (builder) => builder.setColor('brand', {
		vars: '--ui-color-brand',
		overrideVars: { variants: ['solid'], props: ['bg', 'bg-:hover'] },
	}, { utilities: true }),
});
```

```css
/* the output */
.c-brand {
	--wui-c-50: var(--ui-color-brand-50);
	/* ... */
	--wui-c-950: var(--ui-color-brand-950);
	--wui-cv-solid-bg: var(--ui-color-brand-solid-bg);
	--wui-cv-solid-bg-\:hover: var(--ui-color-brand-solid-bg-hover);
}
```

- `c-brand` and `c-accent-brand` exist, and every variant, component and utility works with them.
- `{ utilities: true }` is optional. It adds Tailwind's color utilities, such as `bg-brand-500`, which read the
  variables directly.
- `overrideVars` is optional. It lets the theme choose other shades of a variant for this palette, as in
  [Variant shades from the theme](#variant-shades-from-the-theme).

## Set the shades

Define the 11 variables, before anything is painted. A `<style>` tag in the page works, and so does any stylesheet:

```html
<style id="theme">
	:root {
		--ui-color-brand-50: #f0fdfa;
		--ui-color-brand-100: #ccfbf1;
		--ui-color-brand-200: #99f6e4;
		--ui-color-brand-300: #5eead4;
		--ui-color-brand-400: #2dd4bf;
		--ui-color-brand-500: #14b8a6;
		--ui-color-brand-600: #0d9488;
		--ui-color-brand-700: #0f766e;
		--ui-color-brand-800: #115e59;
		--ui-color-brand-900: #134e4a;
		--ui-color-brand-950: #042f2e;
	}
</style>
```

A shade that is not set is invalid where it is read, and the property falls back to its initial value, such as a
transparent background. Set all 11: the variants use most of them, in light and dark mode.

On Tailwind v4 a value is any CSS color. On Tailwind v3 it is RGB channels, as WindiUI's own variables are:
`--ui-color-brand-500: 20 184 166;`.

## Change it at runtime

Write the variables again, and everything that uses `c-brand` follows, with no new CSS:

```ts
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function setBrand(palette: Record<string, string>, target = document.documentElement) {
	for (const shade of SHADES) target.style.setProperty(`--ui-color-brand-${shade}`, palette[shade]);
}
```

Replacing the text of the `<style id="theme">` tag works as well, and keeps the theme out of inline styles.

## A theme for part of the page

The variables can be set on any element, and the `c-brand` classes inside it use them. That is what the two
containers above do:

```html
<div class="theme-rose">
	<button class="btn v-solid c-brand">Rose theme</button>
</div>
```

```css
.theme-rose {
	--ui-color-brand-50: #fff1f2;
	/* ... */
	--ui-color-brand-950: #4c0519;
}
```

The root palettes need one more step. With [`default` or `accent`](/reference/options#default-and-accent) given by
variables, WindiUI declares `--wui-c-*`, `--wui-c-default-*` and `--wui-c-accent-*` on `:root`, where a `var()` is
resolved once. A container that sets those variables again keeps the colors of the root, unless it is named in
[`rootSelector`](/reference/options#rootselector):

```ts
windiui({
	default: { vars: '--ui-color-neutral' },
	rootSelector: ':root, [data-theme]',
});
```

Then every element with a `data-theme` attribute declares the root variables again, from its own
`--ui-color-neutral-*`.

## Variant shades from the theme

A [per-color override](/guide/customizing#override-a-variant-for-some-colors) is fixed at build time. With
`overrideVars`, the theme can choose the shades of a variant for the palette as well, by setting
`{vars}-{variant}-{prop}`:

```css
.theme-rose {
	/* the shades, as above */
	--ui-color-brand-solid-bg: #9f1239;
	--ui-color-brand-solid-bg-hover: #881337;
}
```

The rose demo above does this: its solid button is on shade 800, and 900 on hover. Where these variables are not set,
`v-solid` uses its own shades, 600 and 700. Set them where you set the shades, so they follow the same scope. See
[Variant overrides at runtime](/guide/colors#variant-overrides-at-runtime) for the names, the dark mode rules and
the cost in CSS.

## Themes on the server

To write the theme from code that has no Tailwind, such as a server that renders a `<style>` tag per tenant, the
[theme engine](/guide/theme-engine) knows the palettes, variants and overrides of your config, and the contrast of
each pair.

## Dark mode

Nothing to set. The variants pick other shades of the same palette in dark mode, so the 11 variables are enough.
A theme that wants other colors in dark mode sets the variables again under its dark selector, such as
`.dark { --ui-color-brand-500: ...; }`.
