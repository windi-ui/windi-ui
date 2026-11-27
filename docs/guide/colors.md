# Colors

WindiUI does not ship its own colors. It reads the `colors` of your Tailwind theme and turns every palette
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
`c-default` and `c-accent` exist as classes (unless [`colors.only`](#limiting-the-color-classes) leaves them out).

### Choosing the two palettes

Set [`colors.default` and `colors.accent`](/reference/options#default-and-accent) to the name of a palette of
your theme:

::: code-group

```ts [JavaScript]
windiui({ colors: { default: 'slate', accent: 'indigo' } });
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
windiui({
	colors: {
		default: { vars: '--ui-color-neutral' },             // var(--ui-color-neutral-50) ... var(--ui-color-neutral-950)
		accent: { 50: '#eef2ff', /* ... */ 950: '#1e1b4b' },
	},
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

Tailwind merges such a palette into `gray` or `blue` shade by shade, so give it all 11 shades. WindiUI warns
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

So an element has two palettes at once: the current one from `c-*`, and the accent from `c-accent-*`. Both inherit,
and they are set independently: `c-blue c-accent-amber` is a blue element with amber accents. What reads the accent:

- the `accent` level of every [variant](/guide/variants#anatomy-of-a-variant) (`bg-accent`, `border-accent`,
  `fg-accent`), which `bg-v-accent`, `text-v-accent` and `border-v-accent` paint;
- `vars.color.accent('600')` in a variant or a component of your own, and `--wui-c-accent-*` in your CSS;
- an [override](/guide/customizing#override-a-variant-for-some-colors) of an `-accent` value, which `c-accent-<name>`
  applies.

`:root` sets the `accent` palette, so without a `c-accent-*` class the accent is blue, or the palette of the
[`colors.accent`](/reference/options#default-and-accent) option.

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
	plugins: [windiui()],
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

## Palettes from the builder

A palette does not have to be in the Tailwind theme. The [builder](/reference/builder#colors) adds one from
CSS variables, from its 11 shades, or as another name for a palette that exists:

```ts
windiui({
	build(builder) {
		builder
			.addColor('primary', { vars: '--ui-color-primary' })
			.addColor('brand', { 50: '#f0f7ff', /* ... */ 950: '#0a1a33' })
			.addColor('danger', 'red');
	}
});
```

Each one gets its `c-<name>` and `c-accent-<name>` class:

```css
.c-primary {
	--wui-c-50: var(--ui-color-primary-50);
	/* ... */
	--wui-c-950: var(--ui-color-primary-950);
}
```

Such a palette is WindiUI's only: there is no `bg-primary-500`. Pass `{ utilities: true }` as the third argument
to also register it as a Tailwind color:

```ts
builder.addColor('primary', { vars: '--ui-color-primary' }, { utilities: true });
```

```html
<div class="c-primary">...</div>
<div class="bg-primary-500 text-primary-50 border-primary-600/50">...</div>
```

## Limiting the color classes

Every palette of the theme is a `c-*` class: more than 50 names with Tailwind v4's default theme, counting the
`c-accent-*` ones. An app with a fixed set of colors can name the ones it uses:

::: code-group

```ts [JavaScript]
windiui({ colors: { only: ['primary', 'error', 'default'] } });
```

```css [@plugin block (Tailwind v4)]
@plugin "@windi-ui/tailwind" {
	colors: primary, error, default;
}
```

:::

Then `c-primary`, `c-error`, `c-default` and their `c-accent-*` classes exist, and `c-fuchsia` emits nothing.
The [safelist](/reference/options#safelist), `colorsNames()` and the
[color utilities from a variant](/guide/utilities#color-utilities-from-a-variant) follow the list. Colors of the
builder are always included, and the root palettes `default` and `accent` keep their variables on `:root`. A
name that is not a palette logs a warning. See [`colors`](/reference/options#colors).

## Palettes that change at runtime

With `{ vars }` the colors are whatever the variables hold when the page is shown, so a `<style>` tag, a
tenant's theme or a theme editor can set them later. WindiUI only writes the references; you define
`--ui-color-primary-50` to `--ui-color-primary-950`. [Runtime theming](/guide/theming) walks through a complete
setup, with a live demo:

```css
:root {
	--ui-color-primary-50: oklch(0.97 0.02 290);
	/* ... */
}

[data-theme-scope] {
	--ui-color-primary-500: oklch(0.6 0.2 150);
}
```

- `c-primary`, `bg-c-*` and, with `utilities: true`, `bg-primary-*` follow a change of the variables at the
  root and inside any container that sets them again.
- The default palette is different. WindiUI declares `--wui-c-*`, `--wui-c-default-*` and `--wui-c-accent-*`
  on `:root`, where a `var()` is resolved once. When [`default` or `accent`](#choosing-the-two-palettes) is
  `{ vars }` and a container sets those variables again, name the container in
  [`rootSelector`](/reference/options#rootselector), so that the variables are declared there too:

  ```ts
  windiui({
  	colors: { default: { vars: '--ui-color-neutral' } },
  	rootSelector: ':root, [data-theme-scope]',
  });
  ```

- On Tailwind v3 the variables must hold RGB channels (`59 130 246`), not a color, as WindiUI's own variables
  do. On v4 they hold any color.

### Variant overrides at runtime

A [per-color override](/guide/customizing#override-a-variant-for-some-colors) is fixed at build time, and a
`c-*` class cannot know which variants it will meet. A palette given by variables can therefore also take its
overrides from variables, with `overrideVars`:

```ts
builder.setColor('primary', {
	vars: '--ui-color-primary',
	overrideVars: { variants: ['solid', 'outline'], props: 'calibrated' },
});
```

```css
.c-primary {
	--wui-c-50: var(--ui-color-primary-50);
	/* ... */
	--wui-cv-solid-bg: var(--ui-color-primary-solid-bg);
	--wui-cv-solid-bg-\:hover: var(--ui-color-primary-solid-bg-hover);
	/* ... */
}
```

- While `--ui-color-primary-solid-bg` is not set, the variable is invalid and `v-solid` uses its own shade. Set
  it, at the root or in any container, and `c-primary v-solid` uses it.
- A static override of the same color is the fallback: with
  `overrideVariant('solid', 'primary', { bg: '800' })` the class sets
  `--wui-cv-solid-bg: var(--ui-color-primary-solid-bg, var(--wui-c-800))`.
- `variants` defaults to every registered variant. `props` is `'calibrated'` by default (`bg`, `fg`, `border`
  and their `:hover` values), `'all'` (every value of the variant), or a list such as
  `['bg', 'bg-:hover', 'fg-soft']`.
- The variables are named `{vars}-{variant}-{prop}`, without the colon of a state: `bg-:hover` of `solid` is
  `--ui-color-primary-solid-bg-hover`. An `-accent` value is set by `c-accent-primary`.
- Where the variant has a dark value, the dark block of the class reads the variable without the static
  fallback, so the variant's dark shade applies while it is unset. The variable is the same in both modes; set
  it per mode if the value differs.
- `colors.default` and `colors.accent` take it too: `default: { vars: '--ui-color-neutral', overrideVars: {} }`
  forwards them on the root.
- It works with every [`overrideMode`](/reference/options#overridemode): a palette given by variables always
  uses override variables.

Each forwarded value is a declaration on the `c-*` class, plus one in its dark block where the variant has a
dark value, and every other color class resets it. Measured on Tailwind v4 for one class with six variants
(the four built-in ones and two more):

| `props` | Declarations | Minified | Minified and gzipped |
| --- | --- | --- | --- |
| without `overrideVars` | 11 | 487 B | 152 B |
| `'calibrated'` | 11 + 56 | 3,989 B | 429 B |
| `'all'` | 11 + 159 | 11,796 B | 905 B |
