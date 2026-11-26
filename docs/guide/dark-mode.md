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

WindiUI wraps the dark values of each variant in a selector or an at-rule. It takes the first of these that
applies:

1. The [`darkSelector`](/reference/options#darkselector) option.
2. The `darkMode` key of your Tailwind config: Tailwind v3, or Tailwind v4 with a config loaded by `@config`.
3. On Tailwind v4.1.17 or higher, **Tailwind's own dark variant**. WindiUI writes `@variant dark`, and Tailwind
   puts in whatever `dark:` means in your stylesheet, a `@custom-variant dark` included.
4. `@media (prefers-color-scheme: dark)`.

So in most projects there is nothing to configure: variants turn dark exactly when Tailwind's `dark:` utilities do.

## Tailwind v4

Declare the dark variant in CSS as usual. WindiUI follows it:

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

Without a `@custom-variant dark`, Tailwind's `dark:` is the media query, and so is WindiUI's.

Tailwind 4.0.0 to 4.1.16 do not expand `@variant dark` for a plugin. There WindiUI uses the media query unless
you set `darkSelector`:

```css [main.css]
@plugin "@windi-ui/tailwind" {
	dark-selector: .dark;
}
@custom-variant dark (&:where(.dark, .dark *));
```

The same applies when WindiUI cannot tell which Tailwind is running it, which happens when Tailwind is bundled
into another tool instead of being loaded from `node_modules`.

## Tailwind v3

WindiUI follows the `darkMode` key of the Tailwind config:

```ts [tailwind.config.ts]
export default {
	darkMode: 'selector',
	plugins: [windiui()],
} satisfies Config;
```

Tailwind v3 drops a rule whose selector has a class that it does not find in your content, and the dark class
is often only set by a script. WindiUI adds the class of the dark selector (`dark`, or your own) to Tailwind's
`safelist`, so the dark values of the default variant are always emitted.

## Setting it yourself

`darkSelector` takes everything Tailwind's `darkMode` takes, and a bare selector. Use it when WindiUI's dark
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
windiui({ darkSelector: '.dark' })
windiui({ darkSelector: ['variant', '&:where([data-theme=dark], [data-theme=dark] *)'] })
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

`darkSelector` only moves WindiUI's dark values. Tailwind's `dark:` utilities keep following Tailwind's own
setting, so keep the two the same unless you mean them to differ.

The root rule, which holds the dark [overrides](/guide/customizing#override-a-variant-for-some-colors) of
`default` and `accent`, also matches the root element itself: `&:is(.dark *)` becomes `&:is(.dark, .dark *)`
there, and `&:not(.light *)` becomes `&:not(.light, .light *)`. WindiUI cannot do this for a Tailwind v4 `@custom-variant dark (&:is(.dark *))`, which Tailwind expands
itself, so with dark overrides of `default` or `accent` write it `&:where(.dark, .dark *)`, as above, or set
`darkSelector: 'class'`.

The dark rule for every element leaves out the `.light` element itself too, so that `<html class="light">` keeps
the page light: `&:not(.light *)` becomes `&:not(.light, .light *)` there. For the same reason this does not happen
for a Tailwind v4 `@custom-variant dark`, so write it `&:not(.light, .light *)` there yourself, or set `darkSelector`.

## What is not automatic

Classes that name a shade, such as `bg-c-100` or `text-accent-600`, are fixed. Use Tailwind's `dark:` variant
for those, or use the variant utilities instead.
