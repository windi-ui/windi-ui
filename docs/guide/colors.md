# Colors

WindUI does not ship its own colors. It reads the `colors` of your Tailwind theme and turns every palette
that has all 11 shades (`50`, `100`, `200`, ... `900`, `950`) into a `c-*` class.

## Choosing a color

`c-<name>` copies that palette's shades into the variables `--wui-c-50` to `--wui-c-950`. Variants and
components read those variables.

<Demo>
<button class="btn v-light c-red">c-red</button>
<button class="btn v-light c-amber">c-amber</button>
<button class="btn v-light c-green">c-green</button>
<button class="btn v-light c-sky">c-sky</button>
<button class="btn v-light c-indigo">c-indigo</button>
<button class="btn v-light c-pink">c-pink</button>
</Demo>

```html
<button class="btn v-light c-red">c-red</button>
<button class="btn v-light c-amber">c-amber</button>
<button class="btn v-light c-green">c-green</button>
```

The class works on any ancestor, because the variables inherit:

<Demo class="c-green">
<button class="btn v-solid">Green</button>
<span class="badge">Also green</span>
</Demo>

```html
<div class="c-green">
	<button class="btn v-solid">Green</button>
	<span class="badge">Also green</span>
</div>
```

## Using the current color directly

The plugin adds a theme color named `c` whose shades point at the current palette. Use it with any Tailwind
color utility, including opacity modifiers:

<Demo>
<div class="c-blue bg-c-100 text-c-800 border border-c-300 p-4 rounded">c-blue</div>
<div class="c-rose bg-c-100 text-c-800 border border-c-300 p-4 rounded">c-rose</div>
<div class="c-teal bg-c-600/20 text-c-700 border border-c-500 p-4 rounded">c-teal, bg-c-600/20</div>
</Demo>

```html
<div class="c-blue bg-c-100 text-c-800 border border-c-300 p-4 rounded">c-blue</div>
<div class="c-rose bg-c-100 text-c-800 border border-c-300 p-4 rounded">c-rose</div>
<div class="c-teal bg-c-600/20 text-c-700 border border-c-500 p-4 rounded">c-teal, bg-c-600/20</div>
```

These utilities use the shade you name, so unlike [variant utilities](/guide/utilities) they do not adapt to
dark mode by themselves.

## `default` and `accent`

Two palette names have a role:

| Name | Role | Value unless you choose one |
| --- | --- | --- |
| `default` | The palette used when no `c-*` class applies. It fills `--wui-c-*` on `:root`. | Tailwind's `gray` |
| `accent` | A second palette available next to the current one, used by the `accent` level of variants. | Tailwind's `blue` |

Both are added to your theme, so `bg-default-100` and `text-accent-600` work as ordinary Tailwind colors, and
`c-default` and `c-accent` exist as classes.

### Choosing the two palettes

Set the [`default` and `accent` options](/reference/options#default-and-accent) to the name of a palette of
your theme:

::: code-group

```ts [JavaScript]
windui({ default: 'slate', accent: 'indigo' });
```

```css [@plugin block (Tailwind v4)]
@plugin "@windi-ui/tailwind" {
	default: slate;
	accent: indigo;
}
```

:::

In JavaScript an option also takes CSS variables or the 11 shades themselves:

```ts
windui({
	default: { vars: '--ui-color-neutral' },             // var(--ui-color-neutral-50) ... var(--ui-color-neutral-950)
	accent: { 50: '#eef2ff', /* ... */ 950: '#1e1b4b' },
});
```

Without an option, a `default` or `accent` palette of your Tailwind theme is used, and without that, `gray`
and `blue`:

```css
@theme {
	--color-default-50: oklch(0.985 0.002 106);
	/* ... all 11 shades ... */
	--color-default-950: oklch(0.147 0.004 49);
}
```

Tailwind merges such a palette into `gray` or `blue` shade by shade, so give it all 11 shades. WindUI warns
during the build when it finds only some of them, and names the ones that still come from `gray` or `blue`.

`bg-default-*`, `text-accent-*`, `c-default`, `c-accent`, `--wui-c-default-*` and `--wui-c-accent-*` all
follow the palette that was chosen.

### Changing the accent

`c-accent-<name>` sets the accent palette (`--wui-c-accent-50` to `--wui-c-accent-950`) without touching the
current color:

<Demo>
<span class="v-light bg-v-accent text-v-accent border border-v-accent px-3 py-1 rounded">accent (blue)</span>
<span class="c-accent-green v-light bg-v-accent text-v-accent border border-v-accent px-3 py-1 rounded">c-accent-green</span>
<span class="c-accent-pink v-light bg-v-accent text-v-accent border border-v-accent px-3 py-1 rounded">c-accent-pink</span>
</Demo>

```html
<span class="c-accent-green v-light bg-v-accent text-v-accent border border-v-accent">...</span>
```

## Custom palettes

Add a palette to your Tailwind theme and it becomes a `c-*` class:

::: code-group

```css [Tailwind v4]
@theme {
	--color-brand-50: oklch(0.97 0.02 290);
	--color-brand-100: oklch(0.93 0.05 290);
	/* ... 200 to 900 ... */
	--color-brand-950: oklch(0.25 0.09 290);
}
```

```ts [Tailwind v3]
export default {
	theme: {
		extend: {
			colors: {
				brand: {
					50: '#f5f3ff',
					100: '#ede9fe',
					// ... 200 to 900 ...
					950: '#2e1065',
				}
			}
		}
	},
	plugins: [windui()],
} satisfies Config;
```

:::

```html
<button class="btn v-solid c-brand">Brand</button>
```

Rules:

- A palette needs all 11 shades. An incomplete one gets no `c-*` class. The [`debug`](/reference/options#debug)
  option logs the palettes that were skipped for this.
- Nested palettes are flattened: `colors.brand.primary.500` becomes `c-brand-primary`.
- The name `c` is reserved for the current color.
- On Tailwind v3, shades are converted to RGB channels so opacity modifiers work. Hex, `rgb()` and `hsl()`
  values are supported; other formats log `Unsupported color format`. On v4 values are used as written.

Colors backed by your own CSS variables (`addColor`) are tracked in
[#36](https://github.com/windi-ui/windi-ui/issues/36).
