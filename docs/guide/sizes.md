# Sizes

A size is a small scale of spacing values plus a font size. Components read the scale instead of fixed
values, so one class resizes them.

<Demo>
<button class="btn v-solid c-blue s-xs">s-xs</button>
<button class="btn v-solid c-blue s-sm">s-sm</button>
<button class="btn v-solid c-blue">default</button>
<button class="btn v-solid c-blue s-lg">s-lg</button>
<button class="btn v-solid c-blue s-xl">s-xl</button>
</Demo>

```html
<button class="btn v-solid c-blue s-xs">s-xs</button>
<button class="btn v-solid c-blue s-sm">s-sm</button>
<button class="btn v-solid c-blue">default</button>
<button class="btn v-solid c-blue s-lg">s-lg</button>
<button class="btn v-solid c-blue s-xl">s-xl</button>
```

## Built-in sizes

Each size maps five spacing slots and a text size to values of your Tailwind theme (`spacing` and `fontSize`).

| Class | `spacing-1` | `spacing-1.5` | `spacing-2` | `spacing-3` | `spacing-4` | `text` |
| --- | --- | --- | --- | --- | --- | --- |
| `s-xs` | `px` | `0.5` | `1` | `1.5` | `2` | `xs` |
| `s-sm` | `0.5` | `1` | `1.5` | `2` | `3` | `sm` |
| `s-default` | `1` | `1.5` | `2` | `3` | `4` | `base` |
| `s-lg` | `1.5` | `2` | `3` | `4` | `5` | `lg` |
| `s-xl` | `2` | `3` | `4` | `5` | `6` | `xl` |

The slot names are those of the default size: `spacing-3` is "what is `3` at the default size". The default
size is set on `:root`, so `s-default` is only needed to reset a size set by an ancestor.

The class writes the values to `--wui-s-*` variables, for example `--wui-s-spacing-3`, `--wui-s-text` and
`--wui-s-line-height`. When the theme's font size also defines a letter spacing or a font weight, they are
written to `--wui-s-letter-spacing` and `--wui-s-font-weight`.

## Inheritance

Sizes inherit, so a size can be set once on a container:

<Demo class="s-sm">
<button class="btn">One</button>
<button class="btn">Two</button>
<button class="btn s-lg">Three (s-lg)</button>
</Demo>

```html
<div class="s-sm">
	<button class="btn">One</button>
	<button class="btn">Two</button>
	<button class="btn s-lg">Three (s-lg)</button>
</div>
```

## Which components use sizes

`btn` uses the size scale for its padding, font size and line height. `badge` is sized in `em`, so it follows
the font size of its parent rather than `s-*`.

## Using the scale in your own CSS

```css
.my-input {
	padding: var(--wui-s-spacing-1\.5) var(--wui-s-spacing-3);
	font-size: var(--wui-s-text);
	line-height: var(--wui-s-line-height);
}
```

The dot in `spacing-1.5` is part of the variable name and has to be escaped in CSS.

Sizes can be added, changed and removed with the [builder API](/guide/customizing#sizes).
