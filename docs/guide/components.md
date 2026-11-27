# Components

WindiUI ships two components today, `btn` and `badge`. They are plain classes built on the three axes, so every
`c-*`, `v-*` and (for `btn`) `s-*` class applies to them.

## Button

<Demo>
<button class="btn">Default</button>
<button class="btn c-blue">Primary</button>
<button class="btn v-solid c-green">Success</button>
<button class="btn v-outline c-red">Danger</button>
<button class="btn v-light c-amber">Warning</button>
<a class="btn v-solid c-sky" href="#button">Link</a>
</Demo>

```html
<button class="btn">Default</button>
<button class="btn c-blue">Primary</button>
<button class="btn v-solid c-green">Success</button>
<button class="btn v-outline c-red">Danger</button>
<button class="btn v-light c-amber">Warning</button>
<a class="btn v-solid c-sky" href="#">Link</a>
```

Sizes:

<Demo>
<button class="btn v-light c-amber s-xs">s-xs</button>
<button class="btn v-outline c-sky s-sm">s-sm</button>
<button class="btn">default</button>
<button class="btn v-solid c-red s-lg">s-lg</button>
<button class="btn v-light c-green s-xl">s-xl</button>
</Demo>

```html
<button class="btn v-light c-amber s-xs">s-xs</button>
<button class="btn v-outline c-sky s-sm">s-sm</button>
<button class="btn">default</button>
<button class="btn v-solid c-red s-lg">s-lg</button>
<button class="btn v-light c-green s-xl">s-xl</button>
```

What `btn` does:

- Paints background, border and text from the current variant, and switches to the variant's `:hover` values on hover.
- Takes its padding, font size and line height from the current [size](/guide/sizes).
- Is `position: relative` and `display: inline-flex`, with a 1px border, a `0.375rem` radius and a font weight of 600.

Everything else is up to utilities: `btn` composes with `rounded-full`, `w-full`, `gap-2` and so on.

::: warning Overriding `btn` colors on Tailwind v4
Tailwind v4 puts `addComponents` CSS in the utilities layer, not the components layer
([tailwindcss#15045](https://github.com/tailwindlabs/tailwindcss/issues/15045)). So `btn`'s own `:hover` rule
beats a plain color utility: `btn bg-red-500` is red at rest and loses the red on hover. Repeat the utility for the
state, or mark it important:

```html
<button class="btn bg-red-500 hover:bg-red-500">Red</button>
<button class="btn bg-red-500!">Red</button>
```

Or build your own `btn` in the components layer: see
[Use the components in your own layer](#use-the-components-in-your-own-layer).

Tailwind v3 emits components before utilities, so a plain utility wins there at rest. On hover `btn`'s `:hover`
rule is more specific, so the same two fixes apply.
:::

::: tip Border style
`btn` sets `border-width` only and expects Tailwind's preflight to make borders `solid`.
:::

## Badge

<Demo>
<span class="badge">Default</span>
<span class="badge c-red">Red</span>
<span class="badge c-green">Green</span>
<span class="badge c-blue">Blue</span>
<span class="badge c-purple">Purple</span>
</Demo>
<Demo>
<span class="badge v-solid">Default</span>
<span class="badge v-solid c-red">Red</span>
<span class="badge v-solid c-green">Green</span>
<span class="badge v-solid c-blue">Blue</span>
<span class="badge v-solid c-purple">Purple</span>
</Demo>
<Demo>
<span class="badge v-outline">Default</span>
<span class="badge v-outline c-red">Red</span>
<span class="badge v-outline c-green">Green</span>
<span class="badge v-outline c-blue">Blue</span>
<span class="badge v-outline c-purple">Purple</span>
</Demo>
<Demo>
<span class="badge v-light">Default</span>
<span class="badge v-light c-red">Red</span>
<span class="badge v-light c-green">Green</span>
<span class="badge v-light c-blue">Blue</span>
<span class="badge v-light c-purple">Purple</span>
</Demo>

```html
<span class="badge c-red">Red</span>
<span class="badge v-solid c-red">Red</span>
<span class="badge v-outline c-red">Red</span>
<span class="badge v-light c-red">Red</span>
```

What `badge` does:

- Paints background and text from the current variant. It has no hover state.
- Draws its edge as a 1px inset `outline` in the variant's border color at 65% opacity, so it does not change the badge's size.
- Is sized in `em` (`font-size: 0.75em`, padding in `em`), so it scales with the text around it:

<Demo>
<h3 style="margin: 0">Heading <span class="badge v-light c-blue">New</span></h3>
<span>Text <span class="badge v-light c-blue">New</span></span>
</Demo>

```html
<h3>Heading <span class="badge v-light c-blue">New</span></h3>
<p>Text <span class="badge v-light c-blue">New</span></p>
```

## Combining

A badge inside a button keeps its own variant and color:

<Demo>
<button class="btn v-light c-blue s-lg">
Inbox
<span class="badge v-solid c-red leading-none rounded-full absolute top-0 start-full -translate-x-1/2 -translate-y-1/2">32</span>
</button>
</Demo>

```html
<button class="btn v-light c-blue s-lg">
	Inbox
	<span class="badge v-solid c-red leading-none rounded-full absolute top-0 start-full -translate-x-1/2 -translate-y-1/2">32</span>
</button>
```

## Use the components in your own layer

With [`componentPrefix`](/reference/options#componentprefix), a component gets a class name of its own, which a
class of yours can take with `@apply`. Put that class in `@layer components`, and the utilities on the element win
over it, including on hover:

```css
@plugin "@windi-ui/tailwind" {
	component-prefix: wui;
}

@layer components {
	.btn { @apply wui-btn; }
	.badge { @apply wui-badge; }
}
```

```html
<button class="btn bg-red-500">Red, also on hover</button>
```

- `.btn` gets all of `wui-btn`: its style, its `:hover` rule and the dark values of the variant. `c-*`, `v-*` and
  `s-*` work on it as before.
- `.wui-btn` itself is only emitted where your content uses it.
- On Tailwind v4 this is what makes `bg-red-500` win on hover: the components layer comes before the utilities
  layer, whatever the specificity. Tailwind v3 has no cascade layers, so there `.btn:hover` still beats a plain
  utility on hover.
- Add your own declarations next to `@apply`, such as `.btn { @apply wui-btn; gap: 0.5rem; }`.

## Your own components

Use the [variant utilities](/guide/utilities) for one-off elements, [`apply-v`](/guide/utilities#apply-v) for
what `btn` gets from the variant, hover included, in a class or under `@apply`, or register a component class
with the [builder API](/guide/customizing#components).
