# Variants

A variant decides which shade of the current color is used for the background, the border and the text. It
is the "style" axis: the same button can be solid, outlined or tinted without changing its color.

## Built-in variants

<Demo>
<button class="btn v-default c-blue">v-default</button>
<button class="btn v-solid c-blue">v-solid</button>
<button class="btn v-outline c-blue">v-outline</button>
<button class="btn v-light c-blue">v-light</button>
</Demo>

```html
<button class="btn v-default c-blue">v-default</button>
<button class="btn v-solid c-blue">v-solid</button>
<button class="btn v-outline c-blue">v-outline</button>
<button class="btn v-light c-blue">v-light</button>
```

Each variant in every color:

<Demo>
<button class="btn">Default</button>
<button class="btn c-blue">Blue</button>
<button class="btn c-green">Green</button>
<button class="btn c-red">Red</button>
<button class="btn c-amber">Amber</button>
<button class="btn c-violet">Violet</button>
</Demo>
<Demo>
<button class="btn v-solid">Default</button>
<button class="btn v-solid c-blue">Blue</button>
<button class="btn v-solid c-green">Green</button>
<button class="btn v-solid c-red">Red</button>
<button class="btn v-solid c-amber">Amber</button>
<button class="btn v-solid c-violet">Violet</button>
</Demo>
<Demo>
<button class="btn v-outline">Default</button>
<button class="btn v-outline c-blue">Blue</button>
<button class="btn v-outline c-green">Green</button>
<button class="btn v-outline c-red">Red</button>
<button class="btn v-outline c-amber">Amber</button>
<button class="btn v-outline c-violet">Violet</button>
</Demo>
<Demo>
<button class="btn v-light">Default</button>
<button class="btn v-light c-blue">Blue</button>
<button class="btn v-light c-green">Green</button>
<button class="btn v-light c-red">Red</button>
<button class="btn v-light c-amber">Amber</button>
<button class="btn v-light c-violet">Violet</button>
</Demo>

## Anatomy of a variant

A variant has three properties, each with four levels and an opacity:

| Property | Levels | Opacity |
| --- | --- | --- |
| `bg` (background) | `bg`, `bg-soft`, `bg-muted`, `bg-accent` | `bg-opacity` |
| `border` | `border`, `border-soft`, `border-muted`, `border-accent` | `border-opacity` |
| `fg` (text) | `fg`, `fg-soft`, `fg-muted`, `fg-accent` | `fg-opacity` |

- The base level is the main color of the property.
- `soft` and `muted` are two quieter steps, for secondary text, dividers or nested surfaces.
- `accent` takes its shade from the [accent palette](/guide/colors#default-and-accent) instead of the current color.

On top of that a variant can define `pseudos` (values for states such as `:hover`) and `dark` (values for
dark mode, which may have their own `pseudos`).

The `v-<name>` class writes all of it to `--wui-v-*` variables. See the
[CSS variables reference](/reference/css-variables#variant-variables).

## Shade tables

Numbers are shades of the current color. `a-` means the accent palette. A dash means the row
has no value of its own: a hover row falls back to its non-hover row, and a dark row to the light one.

### `v-default`

| | `bg` | `bg-soft` | `bg-muted` | `bg-accent` | `border` | `-soft` | `-muted` | `-accent` | `fg` | `-soft` | `-muted` | `-accent` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light | white | 100 | 200 | a-100 | 500 | 400 | 300 | a-500 | 800 | 500 | 400 | a-700 |
| Light, hover | 100 | 200 | 300 | a-200 | - | - | - | - | - | - | - | - |
| Dark | 950 | 900 | 800 | a-900 | 700 | 600 | 500 | a-700 | 200 | 300 | 400 | a-200 |
| Dark, hover | 900 | 800 | 700 | a-900 | - | - | - | - | - | - | - | - |

All opacities are `1`.

### `v-solid`

| | `bg` | `bg-soft` | `bg-muted` | `bg-accent` | `border` | `-soft` | `-muted` | `-accent` | `fg` | `-soft` | `-muted` | `-accent` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light and dark | 600 | 500 | 400 | a-600 | 600 | 500 | 400 | a-600 | white | 200 | 300 | a-200 |
| Hover | 700 | 600 | 500 | a-700 | 700 | 600 | 500 | a-700 | 50 | - | - | - |

`border-opacity` is `0`, so the border takes space but is invisible. `v-solid` has no separate dark values.

### `v-outline`

| | `bg` | `bg-soft` | `bg-muted` | `bg-accent` | `border` | `-soft` | `-muted` | `-accent` | `fg` | `-soft` | `-muted` | `-accent` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light | white | white | white | white | 600 | 500 | 400 | a-600 | 600 | 500 | 400 | a-600 |
| Light, hover | 100 | 100 | 100 | a-100 | - | - | - | - | - | - | - | - |
| Dark | - | - | - | - | 400 | 500 | 600 | a-400 | 400 | 500 | 600 | a-400 |
| Dark, hover | 900 | 900 | 900 | a-900 | - | - | - | - | - | - | - | - |

`bg-opacity` is `0` (transparent), `0.75` on hover and `0.50` on hover in dark mode.

### `v-light`

| | `bg` | `bg-soft` | `bg-muted` | `bg-accent` | `border` | `-soft` | `-muted` | `-accent` | `fg` | `-soft` | `-muted` | `-accent` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light | 100 | 200 | 300 | a-100 | 100 | 200 | 300 | a-100 | 600 | 500 | 400 | a-600 |
| Light, hover | 600 | 500 | 400 | a-600 | 600 | 500 | 400 | a-600 | 50 | 100 | 200 | a-50 |
| Dark | 900 | 700 | 600 | a-900 | 900 | 700 | 600 | a-900 | 300 | 400 | 500 | a-300 |
| Dark, hover | 600 | 500 | 400 | a-600 | 600 | 500 | 400 | a-600 | 50 | - | - | - |

`border-opacity` is `0`. In dark mode `bg-opacity` is `0.5`, and `1` on hover.

## Where to put the class

Put `v-*` on the element that is painted. Unlike `c-*` and `s-*`, a variant set on an element does not reach
its descendants: an element without a `v-*` class of its own uses the `default` variant, in its own color.

```html
<!-- the badge is not solid: it has its own (default) variant -->
<button class="btn v-solid c-blue">Inbox <span class="badge">3</span></button>

<!-- give the badge its own variant -->
<button class="btn v-solid c-blue">Inbox <span class="badge v-light">3</span></button>
```

To let a container set the variant for its content instead, set
[`variantScope: 'inherit'`](/reference/options#variantscope).

### Variants from `@apply`

WindiUI recognises an element that sets a variant by the `v-` in its `class` attribute. A rule that gets its
variant through `@apply` has no such class, so add `v-scope` next to it:

```css
.card {
	@apply c-blue v-light v-scope bg-v text-v;
}
```

Without `v-scope`, the children of `.card` would inherit its variant. `v-scope` is not needed, and does not
exist, with `variantScope: 'universal'`.

## With Tailwind variants

`v-*`, `c-*` and `s-*` are ordinary utilities, so Tailwind variants work on them:

<Demo>
<button class="btn v-outline hover:v-solid c-blue">hover:v-solid</button>
<button class="btn v-light c-blue hover:c-red">hover:c-red</button>
</Demo>

```html
<button class="btn v-outline hover:v-solid c-blue">hover:v-solid</button>
<button class="btn v-light c-blue hover:c-red">hover:c-red</button>
```

## Custom variants

Variants can be added, changed and removed with the [builder API](/guide/customizing#variants). More come from
[presets](/guide/presets): `presets: ['nuxt-ui']` adds `v-soft`, `v-subtle`, `v-ghost` and `v-link`.
