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

`s-md` is the default size under a second name, for a scale that reads `xs`, `sm`, `md`, `lg`, `xl`. It has the
values of `default`, and follows a change made to `default`.

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

### Controls that sit together

A control built the way `btn` is, with its font size and line height from the size and its padding from
`spacing-1.5` and `spacing-3`, is as tall as a `btn` of the same size. No height variable is needed: controls
that read the same steps line up at every size, and stay lined up when a size changes.

```css
.my-input {
	/* the padding of a btn, less its 1px border */
	padding: calc(var(--wui-s-spacing-1\.5) - 1px) calc(var(--wui-s-spacing-3) - 1px);
	border: 1px solid;
	font-size: var(--wui-s-text);
	line-height: var(--wui-s-line-height);
}
```

To line up a group, put it in a flex container. Its default `align-items: stretch` gives every item the height of
the tallest one:

```html
<div class="flex s-sm">
	<input class="my-input">
	<button class="btn v-solid c-blue">Search</button>
</div>
```

An icon follows the text: set its height and let the width follow its aspect ratio. `1em` is the font size
of the text next to it, and `calc(1em + 2px)` makes the icon a bit bigger.

```css
.icon { display: inline-block; height: 1em; width: auto; vertical-align: -0.125em; }
```

An app that does want a fixed control height can give a size a key of its own. A string or a number is written
to `--wui-s-<key>`, after the built-in variables:

```ts
// .s-sm also gets --wui-s-height: 2rem
builder.updateSize('sm', s => ({ ...s, height: '2rem' }));
```

```css
.my-input { height: var(--wui-s-height); }
```

Inside a size that does not set the key, the variable keeps the value of the enclosing size, so give the key
to every size the control is used at.

Sizes can be added, changed and removed with the [builder API](/guide/customizing#sizes).
