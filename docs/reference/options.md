# Options

`@windi-ui/tailwind` default-exports a function. Call it with an options object and pass the result to
Tailwind's `plugins`.

```ts
import windui from '@windi-ui/tailwind';

windui({
	prefix: 'wui',
	build(builder) {
		// ...
	}
});
```

All options are optional. The type is exported from `@windi-ui/core` as `Config`.

## `prefix`

- Type: `string`
- Default: `'wui'`

The prefix of every CSS variable WindUI writes and reads: `--<prefix>-c-*`, `--<prefix>-v-*` and
`--<prefix>-s-*`. It does not change class names; `c-*`, `v-*`, `s-*`, `btn` and `badge` stay the same.

```ts
windui({ prefix: 'app' }); // --app-c-500, --app-v-bg, --app-s-text
```

## `build`

- Type: `(builder: Builder) => void`
- Default: none

Called once per compilation, after the built-in variants, sizes and components are registered and before CSS is
generated. Use the [builder](/reference/builder) to add, update or remove them. See
[Customizing](/guide/customizing) for a walkthrough.

## What the plugin reads from Tailwind

These are not WindUI options, but they shape its output:

| Tailwind setting | Used for |
| --- | --- |
| `theme.colors` | The `c-*` classes: one per palette with all 11 shades. See [Colors](/guide/colors). |
| `theme.spacing`, `theme.fontSize` | The values of the built-in [sizes](/guide/sizes). |
| `theme.opacity` | The modifiers of `bg-v`, `text-v` and `border-v`. |
| `darkMode` | The selector or media query for dark variant values. See [Dark mode](/guide/dark-mode). |

## What the plugin adds to the theme

| Theme color | Value |
| --- | --- |
| `c` (`c-50` to `c-950`) | The current palette, as references to `--wui-c-<shade>` |
| `default` | Tailwind's `gray` |
| `accent` | Tailwind's `blue` |

Options for the `default` and `accent` palettes are tracked in
[#35](https://github.com/windi-ui/windi-ui/issues/35).

## What the plugin generates

| Output | Selector |
| --- | --- |
| Default color, default and accent palettes, black and white | `:root` |
| Default size | `:root` |
| Default variant | `*` |
| One class per palette, plus one per accent palette | `.c-<name>`, `.c-accent-<name>` |
| One class per variant | `.v-<name>` |
| One class per size | `.s-<name>` |
| Variant utilities | `.bg-v`, `.text-v`, `.border-v` and their `-soft`, `-muted`, `-accent` levels |
| Components | `.btn`, `.badge` and those you add |

As with any Tailwind utility, classes are only emitted when they are used in your content.
