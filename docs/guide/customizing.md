# Customizing

The plugin takes a `build` callback. It receives a builder with which you add, update or remove colors,
variants, sizes and components before any CSS is generated.

```ts [tailwind.config.ts]
import windiui from '@windi-ui/tailwind';

export default {
	plugins: [
		windiui({
			build(builder) {
				builder
					.updateVariant('light', (variant) => {
						variant['bg-opacity'] = '0.30';
					})
					.removeVariant('outline');
			}
		})
	],
};
```

Every `add*`, `update*` and `remove*` method returns the builder, so calls chain. The full list is in the
[builder reference](/reference/builder).

The examples on this page are installed on this site, so the demos below are live.

## Variants

### Add a variant

`addVariant(name, factory)` registers a variant and its `v-<name>` class. The factory receives `{ vars, theme }`
and returns a variant: `bg`, `border` and `fg` are required; levels, opacities, `pseudos` and `dark` are optional.

Pick shades with `vars.color(shade)` and `vars.color.accent(shade)`. They return references to the current
palette, such as `var(--wui-c-600)`, which is what makes the variant work with every `c-*` class.

```ts
builder.addVariant('ghost', ({ vars }) => ({
	'bg': vars.color('100'),
	'bg-opacity': '0',
	'border': vars.color('600'),
	'border-opacity': '0',
	'fg': vars.color('700'),

	pseudos: {
		':hover': { 'bg-opacity': '1' }
	},

	dark: {
		'bg': vars.color('800'),
		'fg': vars.color('300'),

		pseudos: {
			':hover': { 'bg-opacity': '1' }
		}
	}
}));
```

<Demo>
<button class="btn v-ghost">Default</button>
<button class="btn v-ghost c-blue">Blue</button>
<button class="btn v-ghost c-green">Green</button>
<button class="btn v-ghost c-red">Red</button>
</Demo>

```html
<button class="btn v-ghost c-blue">Blue</button>
```

Notes:

- Levels you leave out (`bg-soft`, `fg-muted`, ...) keep the value of the `default` variant. Define the levels
  you use.
- `pseudos` keys are CSS pseudo-classes written with the colon, such as `':hover'`. A component only uses the
  states it applies; `btn` applies `:hover`.
- `dark` takes the same shape (without a nested `dark`) and only needs the values that differ.
- If the variant has `pseudos` and `dark` changes a value, repeat the pseudo inside `dark` as above. Otherwise the
  state keeps the light value in dark mode ([#38](https://github.com/windi-ui/windi-ui/issues/38)).

### Update a variant

`updateVariant(name, updater)` gives you the existing variant. Mutate it, or return a new one.

```ts
builder.updateVariant('solid', (variant, { vars }) => {
	variant.bg = vars.color('500');
	variant.pseudos![':hover']!.bg = vars.color('600');
});
```

### Remove a variant

```ts
builder.removeVariant('outline');
```

The `default` variant can be updated but not added or removed.

## Sizes

A size has a `spacing` object with the five slots `1`, `1.5`, `2`, `3` and `4`, and a `text` font size. Read the
values from the Tailwind theme with `theme.spacing(key)` and `theme.fontSize(key)`, or write CSS lengths.

```ts
builder.addSize('2xl', ({ theme }) => ({
	spacing: {
		'1': theme.spacing('3'),
		'1.5': theme.spacing('4'),
		'2': theme.spacing('5'),
		'3': theme.spacing('6'),
		'4': theme.spacing('8'),
	},
	text: theme.fontSize('2xl')
}));
```

<Demo>
<button class="btn v-solid c-blue s-xl">s-xl</button>
<button class="btn v-solid c-blue s-2xl">s-2xl</button>
</Demo>

```html
<button class="btn v-solid c-blue s-2xl">s-2xl</button>
```

`updateSize` and `removeSize` work like their variant counterparts. The `default` size can only be updated.

```ts
builder.updateSize('sm', (size) => {
	size.spacing['3'] = '0.625rem';
});
```

## Components

`addComponent(name, factory)` registers a class named `.<name>`. The factory receives `{ vars, theme, colors, variants }`
and returns a component:

| Field | Purpose |
| --- | --- |
| `name` | The component name. Use the same value as the first argument. |
| `style` | CSS properties in camelCase. Nested selectors such as `'&:focus-visible'` are allowed. |
| `pseudos` | Extra styles per pseudo-class, for example `{ ':disabled': { opacity: '0.5' } }`. |
| `applyVariant` | Which variant properties to paint. `true` means background, border and text. An array picks properties and levels, for example `['bg-soft', 'text']`. |
| `applyVariantPseudos` | States that switch to the variant's pseudo values, for example `[':hover']`. |

```ts
builder.addComponent('chip', ({ vars }) => ({
	name: 'chip',
	applyVariant: ['bg-soft', 'text', 'border-muted'],
	style: {
		display: 'inline-flex',
		alignItems: 'center',
		padding: `${vars.size('spacing-1')} ${vars.size('spacing-3')}`,
		borderWidth: '1px',
		borderRadius: '9999px',
		fontSize: vars.size('text'),
		lineHeight: vars.size('line-height'),
	}
}));
```

<Demo>
<span class="chip">Default</span>
<span class="chip c-blue">Blue</span>
<span class="chip c-green v-light">Green</span>
<span class="chip c-rose v-light s-sm">Rose, s-sm</span>
<span class="chip c-amber v-solid s-lg">Amber, s-lg</span>
</Demo>

```html
<span class="chip c-blue">Blue</span>
<span class="chip c-green v-light">Green</span>
<span class="chip c-rose v-light s-sm">Rose, s-sm</span>
```

Inside `style`, use `vars.size(...)` for the size axis and `vars.variant(...)` for a single variant value.
`colors.toValue(value, alpha)` turns a variable reference into a color with opacity in the syntax of the
running Tailwind version; `badge` uses it for its outline:

```ts
outlineColor: colors.toValue(vars.variant('border'), 0.65)
```

A component's `style` can read a variant variable like this without thinking about elements that have no
`v-*` class: WindiUI adds the `default` variant's value as the fallback, for light and dark mode, to every such
read (see [`variantScope`](/reference/options#variantscope)).

Built-in components can be changed or removed the same way:

```ts
builder
	.updateComponent('btn', (btn) => {
		btn.style.borderRadius = '9999px';
		btn.style.fontWeight = '500';
	})
	.removeComponent('badge');
```

## Listing what exists

`colorsNames()`, `variantsNames()`, `sizesNames()` and `componentsNames()` return the registered names at that
point of the build. `colorsNames()` includes the `accent-<name>` entries.

## Errors

Adding a name that exists, or updating or removing one that does not, logs an error to the console and is
skipped. The build does not fail. `setColor` adds or replaces; `set*` for the other kinds is tracked in
[#40](https://github.com/windi-ui/windi-ui/issues/40).

`build` only describes what to register. It can run more than once per compilation, so keep other work out
of it.

## Colors

Palettes come from the Tailwind theme (see [Custom palettes](/guide/colors#custom-palettes)) and from the
builder:

```ts
builder
	.addColor('primary', { vars: '--ui-color-primary' }, { utilities: true })
	.addColor('danger', 'red')
	.setColor('default', 'slate')
	.updateColor('brand', (palette) => {
		palette.set('500', '#7c3aed');
	})
	.removeColor('fuchsia');
```

See [Palettes from the builder](/guide/colors#palettes-from-the-builder) and the
[builder reference](/reference/builder#colors).

## Variable prefix

The `prefix` option renames the CSS variables (`--wui-*` by default). See [Options](/reference/options#prefix).
