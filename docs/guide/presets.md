# Presets

A preset is a named set of builder calls: variants, sizes, components, colors and overrides, packaged to be
shared. Presets run in order, before your [`build`](/reference/options#build). WindiUI ships one, `nuxt-ui`, and
[`definePreset`](#write-a-preset) makes your own.

## Use a preset

::: code-group

```ts [JavaScript]
import windiui from '@windi-ui/tailwind';
import { nuxtUi } from '@windi-ui/tailwind/presets';

windiui({ presets: ['nuxt-ui'] });
// or with options
windiui({ presets: [nuxtUi({ prefix: 'nui', only: ['soft', 'ghost'] })] });
```

```css [@plugin block (Tailwind v4)]
@plugin "@windi-ui/tailwind" {
	presets: nuxt-ui;
}
```

```json [windiui.config.json]
{ "presets": ["nuxt-ui"] }
```

:::

By name, a preset has its default options. An unknown name is an error.

## Options

Every preset takes the same options.

| Option | Default | What it does |
| --- | --- | --- |
| `override` | `false` | A name that already exists, such as a built-in variant, an item of another preset or a palette of the theme, is kept, and the preset logs one warning that names all of them. `true` replaces it. |
| `prefix` | none | Namespaces the names of the items the preset adds: with `'nui'`, `v-soft` is `v-nui-soft`. |
| `only` | all | The names, without the prefix, of the items the preset adds or changes. The others are left out. |

```ts
windiui({
	presets: [nuxtUi({ prefix: 'nui', only: ['soft', 'link'] })],
	build: (builder) => builder.updateVariant('nui-soft', (soft) => {
		soft['bg-opacity'] = '0.75';
	}),
});
```

Your `build` runs after the presets, so it sees their items and can change them with `update*`, `overrideVariant`
and `set*`. `add*` with a name a preset added logs an error, as with any name that exists.

## `nuxt-ui`

The variants of [Nuxt UI](https://ui.nuxt.com) that WindiUI lacks: `soft`, `subtle`, `ghost` and `link`.
`solid` and `outline` exist already. The demo uses `prefix: 'nui'`, as this site has a `ghost` variant of its own.

<Demo>
<button class="btn v-nui-soft">Default</button>
<button class="btn v-nui-soft c-blue">Blue</button>
<button class="btn v-nui-soft c-green">Green</button>
<button class="btn v-nui-soft c-amber">Amber</button>
<button class="btn v-nui-soft c-red">Red</button>
</Demo>
<Demo>
<button class="btn v-nui-subtle">Default</button>
<button class="btn v-nui-subtle c-blue">Blue</button>
<button class="btn v-nui-subtle c-green">Green</button>
<button class="btn v-nui-subtle c-amber">Amber</button>
<button class="btn v-nui-subtle c-red">Red</button>
</Demo>
<Demo>
<button class="btn v-nui-ghost">Default</button>
<button class="btn v-nui-ghost c-blue">Blue</button>
<button class="btn v-nui-ghost c-green">Green</button>
<button class="btn v-nui-ghost c-amber">Amber</button>
<button class="btn v-nui-ghost c-red">Red</button>
</Demo>
<Demo>
<button class="btn v-nui-link">Default</button>
<button class="btn v-nui-link c-blue">Blue</button>
<button class="btn v-nui-link c-green">Green</button>
<button class="btn v-nui-link c-amber">Amber</button>
<button class="btn v-nui-link c-red">Red</button>
</Demo>

```html
<button class="btn v-soft c-blue">Soft</button>
```

Shades of the current color; a dash means the row has no value of its own. The variants set `bg`, `border` and
`fg`; their other levels are those of `v-default`.

| | `soft` | `subtle` | `ghost` | `link` |
| --- | --- | --- | --- | --- |
| Light | bg 100, fg 800 | bg 50, border 200, fg 800 | fg 700 | fg 700 |
| Light, hover | bg 200 | bg 100 | bg 50 | fg 800 |
| Dark | bg 900 at 0.5, fg 300 | bg 950 at 0.5, border 800, fg 300 | fg 400 | fg 400 |
| Dark, hover | bg 800 at 0.5 | bg 900 at 0.5 | bg 900 at 0.5 | fg 300 |

`soft`, `ghost` and `link` have no visible border, and `ghost` and `link` no background at rest.

In every variant, state and mode, the text reaches a contrast of 4.5:1 with every palette of Tailwind's default
theme, v3 and v4, on a page in the `default` variant (white, gray 950 in dark mode). A test checks it. Change a
shade with [`updateVariant`](/guide/customizing#update-a-variant), or for some colors with
[`overrideVariant`](/guide/customizing#override-a-variant-for-some-colors).

## Write a preset

`definePreset(name, build)` returns the function a config calls, which takes the [options](#options). `build`
gets the builder. Use `set*` to add items: with `override: false` the preset still keeps a name that exists.

```ts
import { definePreset } from '@windi-ui/tailwind/presets';

export const brand = definePreset('brand', (builder) => builder
	.setColor('brand', 'violet', { utilities: true })
	.setVariant('tint', ({ vars }) => ({
		bg: vars.color('100'), border: vars.color('300'), fg: vars.color('800'),
		pseudos: { ':hover': { bg: vars.color('200') } },
		dark: { bg: vars.color('900'), border: vars.color('700'), fg: vars.color('200') },
	}))
	.overrideVariant('tint', 'yellow', { fg: '900' })
	.updateVariant('solid', (solid) => {
		solid['border-opacity'] = '1';
	}));

windiui({ presets: [brand({ prefix: 'acme' })] }); // c-acme-brand, v-acme-tint
```

- Calls on the items the preset added reach them under their prefix: above, the override goes to `acme-tint`.
  Other items, such as `solid`, keep their name.
- A preset that keeps a name skips its later calls on that name too.

See the [builder reference](/reference/builder#presets).
