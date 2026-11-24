# Dark mode

Variants carry dark values, so anything painted through a variant (`btn`, `badge`, `bg-v`, `text-v`,
`border-v`) adapts to dark mode without `dark:` classes. Toggle the theme switch of this site to see it:

<Demo>
<button class="btn c-blue">v-default</button>
<button class="btn v-outline c-blue">v-outline</button>
<button class="btn v-light c-blue">v-light</button>
<span class="bg-v-soft text-v border border-v-muted px-3 py-1 rounded">bg-v-soft text-v border-v-muted</span>
</Demo>

```html
<button class="btn c-blue">v-default</button>
<button class="btn v-outline c-blue">v-outline</button>
<button class="btn v-light c-blue">v-light</button>
<span class="bg-v-soft text-v border border-v-muted px-3 py-1 rounded">...</span>
```

`v-default`, `v-outline` and `v-light` have dark values. `v-solid` looks the same in both modes.
The exact shades are in the [shade tables](/guide/variants#shade-tables).

## How the dark selector is chosen

WindUI wraps the dark values of each variant in a selector or an at-rule. It takes the first of these that
applies:

1. The [`darkSelector`](/reference/options#darkselector) option.
2. The `darkMode` key of your Tailwind config: Tailwind v3, or Tailwind v4 with a config loaded by `@config`.
3. On Tailwind v4.1.17 or higher, **Tailwind's own dark variant**. WindUI writes `@variant dark`, and Tailwind
   puts in whatever `dark:` means in your stylesheet, a `@custom-variant dark` included.
4. `@media (prefers-color-scheme: dark)`.

So in most projects there is nothing to configure: variants turn dark exactly when Tailwind's `dark:` utilities do.

## Tailwind v4

Declare the dark variant in CSS as usual. WindUI follows it:

```css [main.css]
@import "tailwindcss";
@plugin "@windi-ui/tailwind";
@custom-variant dark (&:where(.dark, .dark *));
```

```css
/* output */
.v-outline {
	/* ... */
	&:where(.dark, .dark *) {
		/* dark values */
	}
}
```

Without a `@custom-variant dark`, Tailwind's `dark:` is the media query, and so is WindUI's.

Tailwind 4.0.0 to 4.1.16 do not expand `@variant dark` for a plugin. There WindUI uses the media query unless
you set `darkSelector`:

```css [main.css]
@plugin "@windi-ui/tailwind" {
	dark-selector: .dark;
}
@custom-variant dark (&:where(.dark, .dark *));
```

The same applies when WindUI cannot tell which Tailwind is running it, which happens when Tailwind is bundled
into another tool instead of being loaded from `node_modules`.

## Tailwind v3

WindUI follows the `darkMode` key of the Tailwind config:

```ts [tailwind.config.ts]
export default {
	darkMode: 'selector',
	plugins: [windui()],
} satisfies Config;
```

Tailwind v3 drops a rule whose selector has a class that it does not find in your content, and the dark class
is often only set by a script. WindUI adds the class of the dark selector (`dark`, or your own) to Tailwind's
`safelist`, so the dark values of the default variant are always emitted.

## Setting it yourself

`darkSelector` takes everything Tailwind's `darkMode` takes, and a bare selector. Use it when WindUI's dark
values should follow something else than Tailwind's `dark:`, or on a Tailwind 4 older than 4.1.17.

| `darkSelector` or `darkMode` | Dark values apply under |
| --- | --- |
| `'media'` | `@media (prefers-color-scheme: dark)` |
| `'class'` | `&:is(.dark *)` |
| `['class', '.my-dark']` | `&:is(.my-dark *)` |
| `'selector'` | `&:where(.dark, .dark *)` |
| `['selector', '[data-theme="dark"]']` | `&:where([data-theme="dark"], [data-theme="dark"] *)` |
| `'[data-theme="dark"]'` (`darkSelector` only) | the same as `['selector', '[data-theme="dark"]']` |
| `['variant', '&:where(.dark, .dark *)']` | the given selector or at-rule; it must start with `@` or contain `&` |
| `['variant', ['@media (prefers-color-scheme: dark) { &:not(.light *) }', '&:is(.dark *)']]` | each entry; `@rule { selector }` nests the selector in the at-rule |

::: code-group

```ts [JavaScript]
windui({ darkSelector: '.dark' })
windui({ darkSelector: ['variant', '&:where([data-theme=dark], [data-theme=dark] *)'] })
```

```css [@plugin block]
@plugin "@windi-ui/tailwind" {
	dark-selector: .dark;
}

@plugin "@windi-ui/tailwind" {
	dark-selector: variant, &:where([data-theme=dark], [data-theme=dark] *);
}
```

:::

`darkSelector` only moves WindUI's dark values. Tailwind's `dark:` utilities keep following Tailwind's own
setting, so keep the two the same unless you mean them to differ.

## What is not automatic

Classes that name a shade, such as `bg-c-100` or `text-accent-600`, are fixed. Use Tailwind's `dark:` variant
for those, or use the variant utilities instead.
