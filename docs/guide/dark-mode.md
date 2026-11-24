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

The plugin reads the `darkMode` key of your Tailwind config and wraps the dark values of each variant in the
matching selector or at-rule:

| `darkMode` | Dark values apply under |
| --- | --- |
| not set, or `'media'` | `@media (prefers-color-scheme: dark)` |
| `'class'` | `&:is(.dark *)` |
| `['class', '.my-dark']` | `&:is(.my-dark *)` |
| `'selector'` | `&:where(.dark, .dark *)` |
| `['selector', '[data-theme="dark"]']` | `&:where([data-theme="dark"], [data-theme="dark"] *)` |
| `['variant', '&:where(.dark, .dark *)']` | the given selector or at-rule; it must start with `@` or contain `&` |
| `['variant', ['@media (prefers-color-scheme: dark) { &:not(.light *) }', '&:is(.dark *)']]` | each entry; `@rule { selector }` nests the selector in the at-rule |

Example for a class-based toggle:

```ts [tailwind.config.ts]
export default {
	darkMode: 'selector',
	plugins: [windui()],
} satisfies Config;
```

## Tailwind v4

On v4 the dark variant is usually declared in CSS with `@custom-variant dark (...)`. WindUI does not read that
declaration yet: without a `darkMode` key in the config file it uses the media query. Set `darkMode` in the
config you load with `@config` so that both agree:

```css [main.css]
@import "tailwindcss";
@config "../tailwind.config.ts";
@custom-variant dark (&:where(.dark, .dark *));
```

```ts [tailwind.config.ts]
export default {
	darkMode: 'selector',
	plugins: [windui()],
} satisfies Config;
```

Following the app's dark variant automatically, and a `darkSelector` option, are tracked in
[#34](https://github.com/windi-ui/windi-ui/issues/34).

## What is not automatic

Classes that name a shade, such as `bg-c-100` or `text-accent-600`, are fixed. Use Tailwind's `dark:` variant
for those, or use the variant utilities instead.
