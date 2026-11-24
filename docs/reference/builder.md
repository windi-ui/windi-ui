# Builder API

The builder is the argument of the [`build`](/reference/options#build) option. For a walkthrough with live
examples see [Customizing](/guide/customizing).

## Methods

Every `add*`, `update*` and `remove*` method returns the builder.

| Method | Description |
| --- | --- |
| `addVariant(name, factory)` | Register a variant and its `v-<name>` class. |
| `updateVariant(name, updater)` | Change an existing variant. |
| `removeVariant(name)` | Remove a variant. |
| `addSize(name, factory)` | Register a size and its `s-<name>` class. |
| `updateSize(name, updater)` | Change an existing size. |
| `removeSize(name)` | Remove a size. |
| `addComponent(name, factory)` | Register a component class `.<name>`. |
| `updateComponent(name, updater)` | Change an existing component. |
| `removeComponent(name)` | Remove a component. |
| `colorsNames()` | Names of all `c-*` classes, including `accent-<name>`. |
| `variantsNames()` | Names of the registered variants. |
| `sizesNames()` | Names of the registered sizes. |
| `componentsNames()` | Names of the registered components. |

Signatures:

```ts
add(name: string, factory: (ctx: Context) => T): Builder;
update(name: string, updater: (item: T, ctx: Context) => T | void): Builder;
remove(name: string): Builder;
```

- A `factory` returns the new item.
- An `updater` either mutates the item it receives or returns a replacement.
- `add` with an existing name, and `update` or `remove` with an unknown name, log a console error and do nothing.
- The `default` variant and the `default` size can be updated, but not added or removed.

Built-in names:

| Kind | Names |
| --- | --- |
| Variants | `default`, `solid`, `outline`, `light` |
| Sizes | `default`, `xs`, `sm`, `lg`, `xl` |
| Components | `btn`, `badge` |

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
| `vars.size('spacing-3')` | `var(--wui-s-spacing-3)` |
| `vars.size('text')`, `vars.size('line-height')` | `var(--wui-s-text)`, `var(--wui-s-line-height)` |
| `vars.c(name)`, `vars.v(name)`, `vars.s(name)` | The bare variable name, for example `--wui-c-600` |

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

	// values per state, keyed by pseudo-class (':hover', ':active', ...)
	pseudos?: Record<string, Partial<VariantProperties>>;

	// values for dark mode; same shape, without `dark`
	dark?: Partial<Omit<Variant, 'dark'>>;
}
```

Color values are typed as references produced by `vars.color(...)` or `vars.variant(...)`.

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
}
```

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
- `applyVariantPseudos: [':hover']` repeats that for the state, using the variant's pseudo values. The record form chooses the properties per state.

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

windui({
	build: (builder) => builder.addComponent('chip', chip)
});
```

`@windi-ui/core` is a dependency of `@windi-ui/tailwind`. Add it to your own dependencies if you import from it.
