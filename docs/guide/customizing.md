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

Every `add*`, `set*`, `update*` and `remove*` method returns the builder, so calls chain. The full list is in the
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
- A state value that `pseudos` leaves out follows the base value, also the dark one: on hover, `v-ghost` keeps
  its dark `bg` and `fg` without a `pseudos` inside `dark`.
- `dark` can have its own `pseudos`, for state values that differ in dark mode. With them, a value that `dark`
  sets and its `pseudos` leave out follows the dark base value on hover, also when the light `pseudos` set it.
- `setVariant(name, factory)` takes the same, and replaces a variant of that name, `default` included, where
  `addVariant` logs an error. `setSize` and `setComponent` do the same for sizes and components.

### Update a variant

`updateVariant(name, updater)` gives you the existing variant. Mutate it, or return a new one.

```ts
builder.updateVariant('solid', (variant, { vars }) => {
	variant.bg = vars.color('500');
	variant.pseudos![':hover']!.bg = vars.color('600');
});
```

### Override a variant for some colors

A variant uses the same shades with every color, and a few colors need others. White text on shade 600 passes
the WCAG contrast of 4.5:1 with blue or red, but not with yellow, amber or lime; on 700 it passes with all of
them. `overrideVariant(variant, colors, override)` changes the values of one variant for some colors only:

```ts
builder
	.overrideVariant('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } })
	.overrideVariant('solid', ['amber', 'lime'], { bg: '700', dark: { bg: '600' } })
	.overrideVariant('outline', 'yellow', ({ vars }) => ({ fg: vars.color('700'), dark: { fg: vars.color('300') } }));
```

This site overrides `solid` for yellow as in the first line:

<Demo>
<button class="btn v-solid c-amber">Amber</button>
<button class="btn v-solid c-yellow">Yellow</button>
<div class="c-yellow"><button class="btn v-solid">Yellow from the parent</button></div>
</Demo>

```html
<button class="btn v-solid c-amber">Amber</button>
<button class="btn v-solid c-yellow">Yellow</button>
<div class="c-yellow"><button class="btn v-solid">Yellow from the parent</button></div>
```

- An override takes any value of a variant, with `pseudos` and `dark`, and only needs the values it changes.
- A value is a shade of the color (`'700'`, `'accent-600'`, `'default-200'`, `'white'`, `'black'`) or a
  reference such as `vars.color('700')`. On an `-accent` property a bare shade is one of the accent color:
  `'bg-accent': '700'` is `var(--wui-c-accent-700)`, and `c-accent-yellow` applies it.
- Calls add up: a later call for the same variant and color changes the values it names and keeps the others.
- In dark mode the variant's dark value applies where the override has no `dark` value of its own. `v-light`
  has a dark `fg`, so an override `{ fg: '700' }` of `v-light` gives the dark `fg` in dark mode.
- `addVariant` and `updateVariant` take the same under `colors`, by color name, where `'amber,lime'` names two:
  `{ bg: ..., colors: { yellow: { bg: '700' }, 'amber,lime': { bg: '700' } } }`.

The [`overrides`](/reference/options#overrides) option takes them as data, for a JSON config. It is applied
after `build`:

```ts
windiui({
	overrides: {
		solid: {
			yellow: { bg: '700', pseudos: { ':hover': { bg: '800' } }, dark: { bg: '600' } },
			'amber,lime': { bg: '700' },
		},
	},
});
```

#### How an override reaches the variant

The `c-*` class sets an override variable for each overridden value, and the `v-*` class reads it, with its own
shade as the fallback:

```css
.c-yellow {
	--wui-c-50: ...; /* the 11 shades, as before */
	--wui-cv-solid-bg: var(--wui-c-700);
	--wui-cv-solid-bg-\:hover: var(--wui-c-800);
}
.c-blue {
	--wui-cv-solid-bg: initial;
	--wui-cv-solid-bg-\:hover: initial;
}
.v-solid {
	--wui-v-bg: var(--wui-cv-solid-bg, var(--wui-c-600));
	--wui-v-bg-\:hover: var(--wui-cv-solid-bg-\:hover, var(--wui-c-700));
}
```

So an override works wherever the two classes are: both on one element in any order, `c-yellow` on a parent of
`v-solid`, `@apply c-yellow v-solid` in a rule, and under Tailwind variants such as `hover:v-solid`,
`md:c-yellow` or `dark:c-yellow`. Every other color class resets the variables, so `c-blue` inside `c-yellow` is
not overridden. Only values that some color overrides get a variable; without overrides the CSS is unchanged.
See [Override variables](/reference/css-variables#override-variables).

With [`overrideMode: 'compound'`](/reference/options#overridemode) the override is a `.c-yellow.v-solid` rule
instead, which only applies with both classes on one element. `'both'` emits the two forms.

::: tip A compound rule by hand
`.c-yellow.v-solid { --wui-v-bg: var(--wui-c-700); }` in your own CSS works unlayered or in `@layer utilities`.
On Tailwind v4 it has no effect in `@layer components` or `@layer base`, whatever its specificity: `v-*` is in the
utilities layer, and so are the components of a plugin
([tailwindcss#15045](https://github.com/tailwindlabs/tailwindcss/issues/15045)).
:::

Palettes given by CSS variables can take their overrides from variables at runtime; see
[Variant overrides at runtime](/guide/colors#variant-overrides-at-runtime).

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

Adding a name that exists, or updating, removing or overriding one that does not, logs an error to the console and is
skipped. The build does not fail. `setColor`, `setVariant`, `setSize` and `setComponent` add or replace, and log
nothing.

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

## Presets

A preset is a named set of these calls, which runs before `build`. WindiUI ships `nuxt-ui`, and
`definePreset` makes your own. See [Presets](/guide/presets).

## Variable prefix

The `prefix` option renames the CSS variables (`--wui-*` by default). See [Options](/reference/options#prefix).
