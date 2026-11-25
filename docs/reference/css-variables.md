# CSS variables

Everything WindiUI does at runtime goes through CSS variables. They all start with `--wui-`, or with your own
[`prefix`](/reference/options#prefix).

| Group | Prefix | Set by |
| --- | --- | --- |
| Color | `--wui-c-` | `:root`, `c-<name>`, `c-accent-<name>` |
| Variant | `--wui-v-` | `v-<name>` (and `*` with [`variantScope: 'universal'`](/reference/options#variantscope)) |
| Size | `--wui-s-` | `:root` (default size), `s-<name>` |

## Color variables

| Variable | Meaning | Set by |
| --- | --- | --- |
| `--wui-c-50` ... `--wui-c-950` | The current palette | `:root` (the `default` palette), `c-<name>` |
| `--wui-c-accent-50` ... `--wui-c-accent-950` | The accent palette | `:root` (the `accent` palette), `c-accent-<name>` |
| `--wui-c-default-50` ... `--wui-c-default-950` | The `default` palette, regardless of the current color | `:root` |
| `--wui-c-white`, `--wui-c-black` | The theme's `white` and `black`, or `#fff` and `#000` | `:root` |

The shades are `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900` and `950`.

The value format depends on the Tailwind version:

| Tailwind | Value | Use in your CSS |
| --- | --- | --- |
| v4 | A complete color, as written in the theme (for example `oklch(54.6% 0.245 262.881)`) | `color: var(--wui-c-600)` |
| v3 | Space-separated RGB channels (for example `37 99 235`) | `color: rgb(var(--wui-c-600))` or `rgb(var(--wui-c-600) / 0.5)` |

## Variant variables

For each of `bg`, `border` and `fg`:

| Variable | Meaning |
| --- | --- |
| `--wui-v-bg` | Base value |
| `--wui-v-bg-soft` | Soft level |
| `--wui-v-bg-muted` | Muted level |
| `--wui-v-bg-accent` | Accent level |
| `--wui-v-bg-opacity` | Opacity of the property, `0` to `1` |

and the same with `border` and `fg`, 15 variables in total. Color values are references to color variables,
for example `var(--wui-c-600)` or `var(--wui-c-accent-100)`.

### State variables

When a variant defines `pseudos`, every property also gets a copy per state, named with the pseudo-class as a
suffix:

```css
--wui-v-bg-\:hover
--wui-v-border-soft-\:hover
--wui-v-bg-opacity-\:hover
```

The colon is part of the name and is escaped in CSS. Components that apply a state read these variables inside
the matching pseudo-class; the opacity falls back to the non-state opacity when the state does not set one.

### Dark mode

Dark values are the same variables, set again under the [dark selector](/guide/dark-mode#how-the-dark-selector-is-chosen):

```css
.v-light {
	--wui-v-bg: var(--wui-c-100);
	/* ... */
}

.v-light:where(.dark, .dark *) {
	--wui-v-bg: var(--wui-c-900);
	/* ... */
}
```

### Mode switches

Outside [`variantScope: 'universal'`](/reference/options#variantscope), two more variables select the light or
dark value of the `default` variant where a variant variable is read with a fallback:

| Variable | Light mode | Dark mode |
| --- | --- | --- |
| `--wui-v-on-light` | not set | empty |
| `--wui-v-on-dark` | empty | not set |

`var(--wui-v-on-light, <light value>) var(--wui-v-on-dark, <dark value>)` therefore computes to the value of the
current mode. They are set on `:where(:root)` and under the dark selector, and are not meant to be overridden.

## Size variables

| Variable | Meaning |
| --- | --- |
| `--wui-s-spacing-1` | Spacing slot `1` |
| `--wui-s-spacing-1\.5` | Spacing slot `1.5` (the dot is escaped in CSS) |
| `--wui-s-spacing-2` | Spacing slot `2` |
| `--wui-s-spacing-3` | Spacing slot `3` |
| `--wui-s-spacing-4` | Spacing slot `4` |
| `--wui-s-text` | Font size |
| `--wui-s-line-height` | Line height, when the theme's font size defines one |
| `--wui-s-letter-spacing` | Letter spacing, when the theme's font size defines one |
| `--wui-s-font-weight` | Font weight, when the theme's font size defines one |

## Using them in your own CSS

The color and size variables are set on `:root` (or on [`rootSelector`](/reference/options#rootselector)), so
they can be read anywhere. The variant variables are only
set on an element with a variant, so give the rule one:

::: code-group

```css [Tailwind v4]
.card {
	@apply v-default v-scope;
	background-color: var(--wui-v-bg-soft);
	border: 1px solid var(--wui-v-border-muted);
	color: var(--wui-v-fg);
	padding: var(--wui-s-spacing-4);
}
```

```css [Tailwind v3]
.card {
	@apply v-default v-scope;
	background-color: rgb(var(--wui-v-bg-soft));
	border: 1px solid rgb(var(--wui-v-border-muted));
	color: rgb(var(--wui-v-fg));
	padding: var(--wui-s-spacing-4);
}
```

:::

This ignores the variant's opacity variables. The [variant utilities](/guide/utilities) apply them for you.

A variant variable read on an element that has no variant is invalid, and the property falls back to its
initial value (a transparent background, for example). Besides `@apply v-*` or a `v-*` class on the element,
there are two more ways to read them safely:

- CSS built in JavaScript can add the default as a fallback with
  [`vars.variant(name, { fallback: true })`](/reference/builder#vars).
- [`variantScope: 'universal'`](/reference/options#variantscope) sets the `default` variant on every element, as
  0.7 did.

## Overriding at runtime

Because they are ordinary custom properties, any of them can be set from CSS or JavaScript:

```css
.brand-area {
	--wui-c-600: oklch(0.55 0.2 300);
}
```

```ts
element.style.setProperty('--wui-v-bg-opacity', '0.5');
```
