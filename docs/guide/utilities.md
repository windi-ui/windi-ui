# Utilities

The variant utilities paint a single property from the current variant. They are how you build your own
elements on the color and variant axes without writing a component.

## `bg-v`, `text-v`, `border-v`

| Utility | Property | Reads |
| --- | --- | --- |
| `bg-v` | `background-color` | `--wui-v-bg` and `--wui-v-bg-opacity` |
| `text-v` | `color` | `--wui-v-fg` and `--wui-v-fg-opacity` |
| `border-v` | `border-color` | `--wui-v-border` and `--wui-v-border-opacity` |

<Demo>
<span class="c-red v-default bg-v text-v border border-v px-3 py-1 rounded">v-default</span>
<span class="c-red v-solid bg-v text-v border border-v px-3 py-1 rounded">v-solid</span>
<span class="c-red v-outline bg-v text-v border border-v px-3 py-1 rounded">v-outline</span>
<span class="c-red v-light bg-v text-v border border-v px-3 py-1 rounded">v-light</span>
</Demo>

```html
<span class="c-red v-default bg-v text-v border border-v px-3 py-1 rounded">v-default</span>
<span class="c-red v-solid bg-v text-v border border-v px-3 py-1 rounded">v-solid</span>
<span class="c-red v-outline bg-v text-v border border-v px-3 py-1 rounded">v-outline</span>
<span class="c-red v-light bg-v text-v border border-v px-3 py-1 rounded">v-light</span>
```

`border-v` only sets the color; add `border` (or `border-2`, `border-b`, ...) for the width.

## Levels

Each utility has three more levels: `soft`, `muted` and `accent`.

| | Base | Soft | Muted | Accent |
| --- | --- | --- | --- | --- |
| Background | `bg-v` | `bg-v-soft` | `bg-v-muted` | `bg-v-accent` |
| Text | `text-v` | `text-v-soft` | `text-v-muted` | `text-v-accent` |
| Border | `border-v` | `border-v-soft` | `border-v-muted` | `border-v-accent` |

<Demo>
<div class="c-indigo bg-v-soft border border-v-muted rounded-lg p-4">
<div class="text-v font-semibold">text-v</div>
<div class="text-v-soft">text-v-soft</div>
<div class="text-v-muted">text-v-muted</div>
<div class="text-v-accent">text-v-accent</div>
</div>
<div class="c-indigo v-light bg-v-soft border border-v-muted rounded-lg p-4">
<div class="text-v font-semibold">text-v</div>
<div class="text-v-soft">text-v-soft</div>
<div class="text-v-muted">text-v-muted</div>
<div class="text-v-accent">text-v-accent</div>
</div>
</Demo>

```html
<div class="c-indigo bg-v-soft border border-v-muted rounded-lg p-4">
	<div class="text-v font-semibold">text-v</div>
	<div class="text-v-soft">text-v-soft</div>
	<div class="text-v-muted">text-v-muted</div>
	<div class="text-v-accent">text-v-accent</div>
</div>
```

The inner elements have no `v-*` class, so they use the default variant. Each element resolves its variant by
itself; see [Where to put the class](/guide/variants#where-to-put-the-class). On a pseudo-element
(`before:bg-v`, `placeholder:text-v`) the utilities use the variant of the element it belongs to.

## Opacity modifiers

A variant has an opacity per property (for example `v-outline` has a transparent background). A modifier
overrides it for that element:

<Demo>
<span class="c-blue v-solid bg-v text-v px-3 py-1 rounded">bg-v</span>
<span class="c-blue v-solid bg-v/75 text-v px-3 py-1 rounded">bg-v/75</span>
<span class="c-blue v-solid bg-v/50 text-v px-3 py-1 rounded">bg-v/50</span>
<span class="c-blue v-solid bg-v/[0.33] text-v px-3 py-1 rounded">bg-v/[0.33]</span>
<span class="c-blue v-outline bg-v text-v border border-v/30 px-3 py-1 rounded">border-v/30</span>
</Demo>

```html
<span class="c-blue v-solid bg-v text-v">bg-v</span>
<span class="c-blue v-solid bg-v/75 text-v">bg-v/75</span>
<span class="c-blue v-solid bg-v/50 text-v">bg-v/50</span>
<span class="c-blue v-solid bg-v/[0.33] text-v">bg-v/[0.33]</span>
<span class="c-blue v-outline bg-v text-v border border-v/30">border-v/30</span>
```

Modifiers take the values of your theme's opacity scale (`/50`, `/75`, ...) or an arbitrary value (`/[0.33]`).
The modifier sets the property's opacity variable (for example `--wui-v-bg-opacity`) with `!important` on the
element, so it also wins over the variant's own opacity, including the opacity a variant sets for `:hover`.
It applies to that element only: its children paint at their own opacity. With
[`variantScope: 'inherit'`](/reference/options#variantscope) they inherit it, like the variant itself.

## States

The utilities paint the normal state only. A variant's `:hover` values are applied by components such as
`btn`, and by [`apply-v`](#apply-v). Or switch the variant or the color with a Tailwind variant:

<Demo>
<a class="c-violet v-light hover:v-solid bg-v text-v px-3 py-1 rounded" href="#states">hover:v-solid</a>
</Demo>

```html
<a class="c-violet v-light hover:v-solid bg-v text-v px-3 py-1 rounded" href="#">hover:v-solid</a>
```

## `apply-v`

`apply-v` paints the background, the border color and the text from the current variant, at rest and on
hover, with the variant's opacities. It is what `btn` gets from the variant, as a utility:

<Demo>
<a class="apply-v c-violet v-light border px-3 py-1 rounded" href="#apply-v">v-light</a>
<a class="apply-v c-violet v-solid border px-3 py-1 rounded" href="#apply-v">v-solid</a>
<a class="apply-v c-violet v-outline border px-3 py-1 rounded" href="#apply-v">v-outline</a>
</Demo>

```html
<a class="apply-v c-violet v-light border px-3 py-1 rounded" href="#">v-light</a>
```

A list in brackets chooses the properties, the states, or both:

| Class | Paints |
| --- | --- |
| `apply-v` | `bg`, `border` and `text`, at rest and on `:hover` |
| `apply-v-[bg,text]` | The listed properties, at rest and on `:hover` |
| `apply-v-[bg-muted,text-muted]` | Other levels: `-soft`, `-muted` or `-accent` |
| `apply-v-[hover,focus-visible,active,disabled]` | `bg`, `border` and `text`, at rest and in each listed state |
| `apply-v-[bg,text,focus-visible]` | The listed properties, at rest and in each listed state |

- A property is `bg`, `border` or `text`, alone or with `-soft`, `-muted` or `-accent`. One level per property is
  painted: the first one listed.
- A state is one of `hover`, `focus`, `focus-visible`, `focus-within`, `active`, `visited`, `target`, `checked`,
  `indeterminate`, `disabled`, `enabled`, `invalid`, `valid`, `user-invalid`, `user-valid`, `required`,
  `optional`, `read-only`, `placeholder-shown`, `autofill` and `open`.
- A [state given by another selector](/guide/customizing#states) is named by the
  [`states`](/reference/options#states) option, such as `apply-v-[hover,open]` for
  `states: { open: '[data-state=open]' }`, or by the name of its variables: `apply-v-[data-highlighted]` for a
  variant with a `[data-highlighted]` state. A name of `states` comes before a pseudo-class of the same name.
- A state that the variant has no value for keeps the value at rest. The built-in variants only have `:hover`
  values; a variant of your own can set others in its [`pseudos`](/guide/customizing#add-a-variant). With
  `variantScope: 'universal'`, an element inside one whose variant has a value for that state takes that value.
- A list with a name that is not one of these emits nothing.

It works under `@apply`, which makes it the supported way to paint from a variant in a stylesheet:

```css
.card-action { @apply apply-v; }
.chip        { @apply apply-v-[bg,text]; }
.hint        { @apply apply-v-[bg-muted,text-muted]; }
.tab         { @apply apply-v-[hover,focus-visible,active,disabled]; }
```

Like the other variant utilities, it carries the `default` variant as a fallback outside
[`variantScope: 'universal'`](/reference/options#variantscope), so it paints on an element without a variant.

## Color utilities from a variant

The [`variantUtilities`](/reference/options#variantutilities) option adds `bg-{color}`, `text-{color}` and
`border-{color}` for every palette, painted with a variant's value for that color:

```ts
windiui({ variantUtilities: { bg: 'solid', text: 'outline', border: 'outline' } });
```

<Demo>
<span class="bg-blue text-white px-3 py-1 rounded">bg-blue</span>
<span class="bg-yellow text-white px-3 py-1 rounded">bg-yellow</span>
<span class="text-blue border border-blue px-3 py-1 rounded">text-blue border-blue</span>
<span class="text-yellow border border-yellow px-3 py-1 rounded">text-yellow border-yellow</span>
</Demo>

```html
<span class="bg-blue text-white">bg-blue</span>
<span class="text-blue border border-blue">text-blue border-blue</span>
```

`bg-blue` is the `solid` background of blue, whatever the element's `c-*` class. It follows the variant's
[overrides](/guide/customizing#override-a-variant-for-some-colors) (here `bg-yellow` is shade 700, as on
`c-yellow v-solid`), its dark values, and its opacity. An opacity modifier replaces the opacity: `bg-blue/50`.
A palette given by [variables with `overrideVars`](/guide/colors#variant-overrides-at-runtime) reads its
runtime variable first:

```css
.bg-primary {
	background-color: var(--ui-color-primary-solid-bg, var(--ui-color-primary-600));
}
```

Tailwind's own colors keep their utilities. A color with a single value, such as `white`, `black` or a palette
with a `DEFAULT` shade, is not given one, so `bg-white` and `bg-brand` stay Tailwind's. Arbitrary values such as
`text-[red]` stay Tailwind's as well.

## The current color

`bg-c-500`, `text-c-700`, `border-c-300` and every other Tailwind color utility accept the `c` color, which
follows the current `c-*` class. See [Using the current color directly](/guide/colors#using-the-current-color-directly).

## Arbitrary values

`bg-`, `text-` and `border-` with an arbitrary value stay Tailwind's own utilities. The variant utilities only
answer `v`, `v-soft`, `v-muted` and `v-accent`:

```html
<div class="bg-[#123456] text-[14px] border-[3px]">Tailwind's output, nothing from WindiUI</div>
```

Likewise `c-[...]`, `v-[...]` and `s-[...]` with a value WindiUI does not know emit nothing. The exception is
`c-[--name]` (and `c-accent-[--name]`), a [palette of the `--name-{shade}` variables](/guide/colors#a-palette-at-the-call-site).
