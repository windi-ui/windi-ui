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
itself; see [Where to put the class](/guide/variants#where-to-put-the-class).

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

## States

The utilities paint the normal state only. A variant's `:hover` values are applied by components such as
`btn`. For a hover effect on your own element, switch the variant or the color with a Tailwind variant:

<Demo>
<a class="c-violet v-light hover:v-solid bg-v text-v px-3 py-1 rounded" href="#states">hover:v-solid</a>
</Demo>

```html
<a class="c-violet v-light hover:v-solid bg-v text-v px-3 py-1 rounded" href="#">hover:v-solid</a>
```

## The current color

`bg-c-500`, `text-c-700`, `border-c-300` and every other Tailwind color utility accept the `c` color, which
follows the current `c-*` class. See [Using the current color directly](/guide/colors#using-the-current-color-directly).

## Arbitrary values

`bg-`, `text-` and `border-` with an arbitrary value stay Tailwind's own utilities. The variant utilities only
answer `v`, `v-soft`, `v-muted` and `v-accent`:

```html
<div class="bg-[#123456] text-[14px] border-[3px]">Tailwind's output, nothing from WindUI</div>
```

Likewise `c-[...]`, `v-[...]` and `s-[...]` with a value WindUI does not know emit nothing.
