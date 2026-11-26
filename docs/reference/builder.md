# Builder API

The builder is the argument of the [`build`](/reference/options#build) option. For a walkthrough with live
examples see [Customizing](/guide/customizing).

## Methods

Every `add*`, `set*`, `update*` and `remove*` method returns the builder.

| Method | Description |
| --- | --- |
| `addColor(name, value, options?)` | Register a palette and its `c-<name>` and `c-accent-<name>` classes. See [Colors](#colors). |
| `setColor(name, value, options?)` | The same, replacing a palette of that name. |
| `updateColor(name, updater)` | Change the shades of an existing palette. |
| `removeColor(name)` | Remove a palette and its classes. |
| `addVariant(name, factory)` | Register a variant and its `v-<name>` class. |
| `setVariant(name, factory)` | The same, replacing a variant of that name. |
| `updateVariant(name, updater)` | Change an existing variant. |
| `removeVariant(name)` | Remove a variant. |
| `overrideVariant(variant, colors, override)` | Change values of a variant for some colors. See [Overrides](#overrides). |
| `calibrate(policy, options?)` | Fill overrides so that every variant meets a contrast policy. See [Calibrate](#calibrate). |
| `addSize(name, factory)` | Register a size and its `s-<name>` class. |
| `setSize(name, factory)` | The same, replacing a size of that name. |
| `updateSize(name, updater)` | Change an existing size. |
| `removeSize(name)` | Remove a size. |
| `addComponent(name, factory)` | Register a component class `.<name>`. |
| `setComponent(name, factory)` | The same, replacing a component of that name. |
| `updateComponent(name, updater)` | Change an existing component. |
| `removeComponent(name)` | Remove a component. |
| `colorsNames(all?)` | Names of all `c-*` classes, including `accent-<name>`. With [`colors.only`](/reference/options#colors), the listed palettes and the colors of the builder; with `all`, also the palettes it leaves out. |
| `variantsNames()` | Names of the registered variants. |
| `sizesNames()` | Names of the registered sizes. |
| `componentsNames()` | Names of the registered components. |

One call of each:

```ts
windiui({
	build(builder) {
		builder
			// colors
			.addColor('primary', { vars: '--ui-color-primary' }, { utilities: true })
			.setColor('danger', 'red')
			.updateColor('primary', (palette) => {
				palette.set('950', 'var(--ui-color-primary-900)');
			})
			.removeColor('fuchsia')
			// variants
			.addVariant('tint', ({ vars }) => ({ bg: vars.color('100'), border: vars.color('300'), fg: vars.color('800') }))
			.setVariant('outline', ({ vars }) => ({ bg: vars.color('white'), 'bg-opacity': '0', border: vars.color('500'), fg: vars.color('700') }))
			.updateVariant('solid', (solid, { vars }) => {
				solid.bg = vars.color('500');
			})
			.overrideVariant('solid', 'yellow', { bg: '700' })
			.removeVariant('light')
			// sizes
			.addSize('2xl', ({ theme }) => ({
				spacing: { '1': theme.spacing('3'), '1.5': theme.spacing('4'), '2': theme.spacing('5'), '3': theme.spacing('6'), '4': theme.spacing('8') },
				text: theme.fontSize('2xl'),
			}))
			.setSize('xs', ({ theme }) => ({
				spacing: { '1': '0', '1.5': theme.spacing('px'), '2': theme.spacing('0.5'), '3': theme.spacing('1'), '4': theme.spacing('1.5') },
				text: theme.fontSize('xs'),
			}))
			.updateSize('sm', (size) => ({ ...size, height: '2rem' }))
			.removeSize('xl')
			// components
			.addComponent('chip', () => ({ name: 'chip', applyVariant: true, style: { borderRadius: '9999px' } }))
			.setComponent('badge', () => ({ name: 'badge', applyVariant: ['bg-soft', 'text'], style: { fontSize: '0.75em' } }))
			.updateComponent('btn', (btn) => {
				btn.style.borderRadius = '9999px';
			})
			.removeComponent('chip');

		// The names at this point: ['default', 'solid', 'outline', 'tint']
		const variants = builder.variantsNames();
	}
});
```

`colorsNames()`, `sizesNames()` and `componentsNames()` work the same way.

Signatures:

```ts
add(name: string, factory: (ctx: Context) => T): Builder;
set(name: string, factory: (ctx: Context) => T): Builder;
update(name: string, updater: (item: T, ctx: Context) => T | void): Builder;
remove(name: string): Builder;
```

- A `factory` returns the new item.
- An `updater` either mutates the item it receives or returns a replacement.
- `add` with an existing name, and `update` or `remove` with an unknown name, log a console error and do nothing.
- `set` adds the item, or replaces the one of that name, and logs nothing. A replaced variant loses the overrides
  that earlier calls gave it.
- The `default` variant, the `default` size and the `default` color can be updated or replaced with `set`, but
  not added or removed.
- The `md` size is the `default` size under a second name. `updateSize('md', ...)` makes it a size of its own,
  starting from the values of `default`. `addSize` and `setSize` replace it, and `removeSize('md')` removes it.
- `build` can run more than once per compilation; see [`utilities`](#colors).

Built-in names:

| Kind | Names |
| --- | --- |
| Variants | `default`, `solid`, `outline`, `light` |
| Sizes | `default`, `md`, `xs`, `sm`, `lg`, `xl` |
| Components | `btn`, `badge` |

## Colors

```ts
addColor(name: string, value: ColorValue, options?: { utilities?: boolean }): Builder;
setColor(name: string, value: ColorValue, options?: { utilities?: boolean }): Builder;
updateColor(name: string, updater: (palette: Map<ColorShade, string>, ctx: Context) => Map<ColorShade, string> | void): Builder;
removeColor(name: string): Builder;

type ColorValue = string | { vars: string, overrideVars?: OverrideVars } | Record<ColorShade, string> | PaletteSpec;

interface OverrideVars {
	variants?: string[];                                // every registered variant
	props?: 'calibrated' | 'all' | VariantProperty[];   // 'calibrated'
}
```

| `value` | Shades |
| --- | --- |
| `{ vars: '--name' }` | `var(--name-50)` to `var(--name-950)` |
| `{ vars: '--name', overrideVars: { ... } }` | The same; the variant overrides come from `--name-{variant}-{prop}` too. See [Variant overrides at runtime](/guide/colors#variant-overrides-at-runtime). |
| `{ 50: '...', ..., 950: '...' }` | As given. All 11 are needed. |
| `'red'` | A copy of that palette, which has to exist at that point of `build` |
| `{ seed: '#2563eb' }`, `{ palette: 'blue', adjust: { ... } }`, ... | A [palette spec](/reference/theme-engine#palette-specs), resolved at build time to literal hex shades. A `palette` base names a palette that exists at that point of `build`; without `adjust` and `pins` it is the same as the name. |

- A value that gives no palette, such as an unknown name, logs an error and is skipped.
- `updateColor` gets the shades as a `Map`. On Tailwind v3 its values are RGB channels (`239 68 68`).
- Removing `accent` leaves `--wui-c-accent-*` unset.

`utilities: true` also registers the palette as a color of the Tailwind theme, so `bg-<name>-<shade>` and
every other color utility exist, with opacity modifiers. The default is off.

- With `{ vars }` the utilities reference your variables directly (`background-color: var(--name-500)`), so
  they follow them at runtime, also inside a container that sets them again.
- A palette name must be one of Tailwind's own palettes (`'red'`, `'slate'`, ...) to get utilities; for
  another one, an error is logged and the color is added without them. The same goes for the `palette` base of a
  palette spec, which is resolved over Tailwind's own palettes for the utilities.
- Tailwind resolves its theme before the builder exists. To know these colors in time, WindiUI first runs
  `build` on a builder that only notes `addColor`, `setColor` and `removeColor`; its `*Names()` return empty
  lists. So `build` runs twice, and a color that is only added depending on what `*Names()` return gets no
  utilities.
- `addColor` with the name of a color the theme already has is skipped as a whole, like `addColor` without
  `utilities`: the error is logged and the theme color stays. `setColor` replaces the WindiUI color and the
  theme color.

## Overrides

```ts
overrideVariant(
	variant: string,
	colors: string | string[],
	override: VariantOverride | ((ctx: Context) => VariantOverride)
): Builder;
```

```ts
builder
	.overrideVariant('solid', 'yellow', { bg: '700', pseudos: { ':hover': { bg: '800' } } })
	.overrideVariant('solid', ['amber', 'lime'], { bg: '700' })
	.overrideVariant('outline', 'yellow', ({ vars }) => ({ fg: vars.color('700'), dark: { fg: vars.color('300') } }));
```

`VariantOverride` is a `Variant` in which every value is optional and may be a shade:

```ts
type VariantOverride = Partial<Omit<Variant, 'colors'>>; // and each value may also be a shade
```

| Value | Means |
| --- | --- |
| `'700'` | `var(--wui-c-700)`; on an `-accent` property `var(--wui-c-accent-700)` |
| `'accent-600'`, `'default-200'` | `var(--wui-c-accent-600)`, `var(--wui-c-default-200)` |
| `'white'`, `'black'` | `var(--wui-c-white)`, `var(--wui-c-black)` |
| Anything else, such as `vars.color('700')` or an opacity | As written |

- The override is merged into the ones the colors have: a later call changes the values it names and keeps the
  others.
- A color name in `colors` may hold several names separated by commas, as in `'amber,lime'`.
- An unknown variant logs an error, and the call is skipped.
- `Variant.colors` holds the overrides by color name, so `addVariant` and `updateVariant` can set them too.
- The [`overrides`](/reference/options#overrides) option takes the same as data;
  [`overrideMode`](/reference/options#overridemode) chooses how they are emitted.

See [Override a variant for some colors](/guide/customizing#override-a-variant-for-some-colors).

## Calibrate

```ts
calibrate(policy: CalibrationPolicy, options?: CalibrateOptions): Builder;
```

```ts
builder.calibrate({ text: 4.5 });
builder.calibrate({ text: 4.5, border: 3 }, { strategy: ['shift-bg', 'flip-fg'] });
```

Computes per-color overrides with the theme engine's
[`calibrate`](/reference/theme-engine#calibration), so that every variant on every color meets `policy`, light and
dark, at rest and in every state the variant declares, and adds them.

- It runs once the build is done, wherever it is called: after `build`, the presets and the
  [`overrides`](/reference/options#overrides) option. Several calls run in order.
- It calibrates every color with a `c-*` class, `default` and `accent` included, whose shades are literal colors.
  A palette given by CSS variables is left out.
- The overrides are added under the explicit ones: a value that `overrideVariant` or `overrides` sets is never
  replaced.
- A pair it cannot repair is logged as a warning.
- `CalibrationPolicy` and `CalibrateOptions` are exported as types from `@windi-ui/core`.

See [Calibrate contrast](/guide/theme-engine#calibrate-contrast).

## Presets

```ts
import { definePreset, type Preset, type PresetOptions } from '@windi-ui/tailwind/presets';

function definePreset(name: string, build: (builder: Builder) => void): (options?: PresetOptions) => Preset;

interface PresetOptions {
	override?: boolean; // default false
	prefix?: string;
	only?: string[];
}
```

`definePreset` is also exported from `@windi-ui/core` and `@windi-ui/core/presets`. The preset's `build` gets a
builder that applies the options to the calls it makes:

- `add*` and `set*` give the item the prefix. With `override: false`, a name that exists is kept, and the
  preset logs one warning that names all of them. A name the preset added itself can be set again.
- `update*`, `remove*` and `overrideVariant` reach an item of the preset under its prefix, and any other item,
  such as `solid`, under its own name. They skip a name the preset kept.
- `only` leaves out every call on a name that is not in it, the prefix left out.
- `*Names()` list every item, those of the preset with their prefix.

See [Presets](/guide/presets).

## Context

Factories and updaters receive a context object.

| Property | Available to | Description |
| --- | --- | --- |
| `vars` | all | Builds CSS variable names and `var()` references. See [`vars`](#vars). |
| `theme` | all | Reads the Tailwind theme. See [`theme`](#theme). |
| `colors` | components | `colors.toValue(value, alpha?)` returns a color value with optional opacity. `value` is a shade name (`'600'`, `'accent-600'`, `'white'`) or any CSS color or `var()` reference. |
| `variants` | components | `variants.apply(variant?, pseudos?, target?)` writes variant declarations into a style object. Components normally use `applyVariant` instead. `variants.withFallback(css)` adds the `default` variant's values as fallbacks to the variant variables read in a style object; a component's `style` gets this automatically. |

### `vars`

| Call | Returns |
| --- | --- |
| `vars.color('600')` | `var(--wui-c-600)` |
| `vars.color('white')`, `vars.color('black')` | `var(--wui-c-white)`, `var(--wui-c-black)` |
| `vars.color.accent('600')` | `var(--wui-c-accent-600)` |
| `vars.color.default('600')` | `var(--wui-c-default-600)` |
| `vars.variant('bg')` | `var(--wui-v-bg)` |
| `vars.variant('fg-soft', fallback)` | `var(--wui-v-fg-soft, <fallback>)` |
| `vars.variant('bg', { fallback: true })` | `var(--wui-v-bg, var(--wui-c-white))`: the fallback is the light value of the built-in `default` variant |
| `vars.variant('fg-:hover', { fallback: true })` | `var(--wui-v-fg-\:hover, var(--wui-v-fg, var(--wui-c-800)))`: a state the `default` variant does not set falls back to the base variable first |
| `vars.size('spacing-3')` | `var(--wui-s-spacing-3)` |
| `vars.size('text')`, `vars.size('line-height')` | `var(--wui-s-text)`, `var(--wui-s-line-height)` |
| `vars.size('ring')` | `var(--wui-s-ring)`: a key of your own, which type-checks too |
| `vars.c(name)`, `vars.v(name)`, `vars.s(name)` | The bare variable name, for example `--wui-c-600` |
| `vars.cv('solid-bg')` | `--wui-cv-solid-bg`: an [override variable](/reference/css-variables#override-variables) |

The prefix follows the [`prefix`](/reference/options#prefix) option.

The same object is available outside a builder callback: `varsProvider(prefix)` is exported from
`@windi-ui/core`.

```ts
import { varsProvider } from '@windi-ui/core';

const vars = varsProvider('wui');
vars.variant('border', { fallback: true }); // var(--wui-v-border, var(--wui-c-500))
```

### `theme`

| Call | Returns |
| --- | --- |
| `theme.spacing('3')` | The theme's spacing value for that key |
| `theme.fontSize('lg')` | The theme's font size: a string, or `[size, lineHeight]`, or `[size, { lineHeight, letterSpacing, fontWeight }]` |
| `theme.colors()` | All theme colors, flattened to `name-shade` keys |
| `theme.colors('blue')` | One color or palette |
| `theme.colorValue(value, alpha?)` | A color value with optional opacity |

## Variant

```ts
interface Variant {
	'bg': string;
	'bg-soft'?: string;
	'bg-muted'?: string;
	'bg-accent'?: string;
	'bg-opacity'?: '1' | '0' | `0.${number}`;

	'border': string;
	'border-soft'?: string;
	'border-muted'?: string;
	'border-accent'?: string;
	'border-opacity'?: '1' | '0' | `0.${number}`;

	'fg': string;
	'fg-soft'?: string;
	'fg-muted'?: string;
	'fg-accent'?: string;
	'fg-opacity'?: '1' | '0' | `0.${number}`;

	// values per state, keyed by pseudo-class (':hover', ':active', ...) or another selector ('[data-state=open]')
	pseudos?: Record<VariantState, Partial<VariantProperties>>;

	// values for dark mode; same shape, without `dark` and `colors`
	dark?: Partial<Omit<Variant, 'dark' | 'colors'>>;

	// overrides by color name; see Overrides
	colors?: Record<string, VariantOverride>;
}
```

Color values are typed as references produced by `vars.color(...)` or `vars.variant(...)`, or, since 0.9, any color
such as `'#fff'`, which is written as given. See [Variant values](/reference/theme-engine#variant-values).
`VariantState`, the type of a state key, offers the pseudo-classes and the common states of headless libraries and
takes any string; it is exported from `@windi-ui/core`. See [States](/guide/customizing#states).

## Size

```ts
interface Size {
	spacing: {
		'1': string;
		'1.5': string;
		'2': string;
		'3': string;
		'4': string;
	};
	text: FontSize; // as returned by theme.fontSize()

	// keys of your own, each written to `--wui-s-<key>`
	[key: string]: unknown;
}
```

A string or a number is written to `--wui-s-<key>`, and an object of strings to `--wui-s-<key>-<name>`, as
`spacing` is. Keys of your own come after the built-in variables, so a size without them writes what it wrote in
0.7, in the same order. `Size` and `SizeProperty`, the names `vars.size()` takes, are exported from
`@windi-ui/core`.

## Component

```ts
interface IComponent {
	name: string;
	style: CSS.Properties;
	pseudos?: Record<string, CSS.Properties>;
	applyVariant?: boolean | ApplyVariantProp[];
	applyVariantPseudos?: string[] | Record<string, boolean | ApplyVariantProp[]> | false;
}

type ApplyVariantProp =
	| 'bg' | 'bg-soft' | 'bg-muted' | 'bg-accent'
	| 'border' | 'border-soft' | 'border-muted' | 'border-accent'
	| 'text' | 'text-soft' | 'text-muted' | 'text-accent';
```

- `applyVariant: true` paints `bg`, `border` and `text`. An array paints the listed properties only, at most one level per property.
- `applyVariantPseudos: [':hover']` repeats that for the state, using the variant's pseudo values. A state can be any selector of the element, such as `'[data-state=open]'`. The record form chooses the properties per state. A state that the `default` variant has no value for, such as `:focus-visible`, falls back to the value at rest where the variant has none either.
- The [`apply-v`](/guide/utilities#apply-v) utility gives the same CSS without a component: `apply-v` is `applyVariant: true, applyVariantPseudos: [':hover']`.

`@windi-ui/core/components` exports `defineComponent`, a typed identity helper for writing a component in its own
file, along with the built-in `button` and `badge` definitions:

```ts [chip.ts]
import { defineComponent } from '@windi-ui/core/components';

export default defineComponent(({ vars }) => ({
	name: 'chip',
	applyVariant: ['bg-soft', 'text'],
	style: {
		padding: `${vars.size('spacing-1')} ${vars.size('spacing-3')}`,
		borderRadius: '9999px',
	}
}));
```

```ts [tailwind.config.ts]
import chip from './chip';

windiui({
	build: (builder) => builder.addComponent('chip', chip)
});
```

`@windi-ui/core` is a dependency of `@windi-ui/tailwind`. Add it to your own dependencies if you import from it.
