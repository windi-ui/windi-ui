# Config file

WindiUI options can live in a file of their own. There are three ways to connect that file to Tailwind, tried
in this order:

| | How it is loaded | Rebuilds on change (Tailwind v4 dev) |
| --- | --- | --- |
| 1. Config module | `@plugin "./windiui.config.ts";` Tailwind loads the module, relative to the stylesheet. | Yes |
| 2. Named file | The [`config`](/reference/options#config) option. WindiUI loads the file, relative to the working directory. | No, see [Rebuilds](#rebuilds) |
| 3. Search | Nothing to write. WindiUI searches from the working directory. | No, see [Rebuilds](#rebuilds) |

Use the config module when you can, and always in a monorepo or a layered app: it is the only form where the
stylesheet says which file is meant.

## Config module

The module exports the configured plugin, and `@plugin` points at it. A call that passes
[`build`](/reference/options#build) is a complete config, and WindiUI looks for no other file. A call without
`build` still [searches](#search) from the working directory and takes the options it does not set itself from
the file it finds. Pass `config: false` to stop that, which is what you want in a monorepo:

```ts [windiui.config.ts]
export default windiui({ prefix: 'app', config: false });
```

::: code-group

```ts [windiui.config.ts]
import windiui from '@windi-ui/tailwind';

export default windiui({
	prefix: 'app',
	build(builder) {
		// ...
	}
});
```

```css [main.css]
@import "tailwindcss";
@plugin "./windiui.config.ts";
```

:::

This is Tailwind v4 only. On Tailwind v3, call `windiui({...})` in `tailwind.config.js` as before.

## Named file

::: code-group

```css [main.css (Tailwind v4)]
@plugin "@windi-ui/tailwind" {
	config: "./config/windiui.ts";
}
```

```ts [tailwind.config.ts]
windiui({ config: './config/windiui.ts' })
```

:::

The path is relative to the working directory of the build, not to the stylesheet. A file that does not exist
is an error.

## Search

`@plugin "@windi-ui/tailwind";` and `windiui()` look for the nearest of these, from the working directory up to
the workspace root:

- `windiui.config.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` or `.json`
- the `windiui` key of the nearest `package.json`

The workspace root is the nearest directory with a `pnpm-workspace.yaml`, a `.git` or a lockfile. A
`windiui.config.*` file anywhere on the way wins over `package.json`.

The search is skipped when the call passes [`build`](/reference/options#build), because that call is already
a complete config, and when it passes `config: false`.

## What the file exports

For a named or a searched file, export the options. `defineConfig` only adds types:

```ts [windiui.config.ts]
import { defineConfig } from '@windi-ui/tailwind/config';

export default defineConfig({
	prefix: 'app',
	build(builder) {
		// ...
	}
});
```

`defineConfig` is also exported from `@windi-ui/core`. A file that exports the plugin, as a config module
does, is accepted as well, so one `windiui.config.ts` works with all three forms.

## Inline options win

Options written at the call or in the `@plugin` block override those of the file, one by one:

```css
/* windiui.config.json: { "prefix": "app", "variantScope": "inherit" } */
@plugin "@windi-ui/tailwind" {
	prefix: site; /* --site-*, and variantScope stays 'inherit' */
}
```

## Limits

### The working directory

Tailwind v4 does not tell a plugin where the stylesheet is, so a named file and the search go by the working
directory of the build. In a monorepo built from its root, or an app made of layers, that can be the wrong
directory and the wrong file. Use a [config module](#config-module) there.

### Rebuilds

Checked with `@tailwindcss/vite` 4.3.5 on Vite 8: Tailwind only rebuilds for the modules it loaded itself.

- A **config module** is one of them. Saving it rebuilds the CSS.
- A **named or searched file** is not. Saving it does not change the CSS of a running dev server. The new
  config is read by the next full rebuild: save the stylesheet, or restart the dev server.
- A **module that a named or searched file imports** is not watched by WindiUI either. After changing it, save
  the config file too and then the stylesheet, or restart the dev server.

A build-tool plugin that watches the config file is planned in
[#61](https://github.com/windi-ui/windi-ui/issues/61).

### Node.js

Config files are loaded with [unconfig](https://github.com/antfu-collective/unconfig), which needs a Node.js
that can `require()` an ES module: 22.12 or higher, or 20.19 or higher. On an older one a named file is an
error and the search is skipped. A config module has no such requirement.

## `loadWindiUIConfig`

The loader behind the named file and the search, for tools that need the same config as the plugin. Node.js
only.

```ts
import { loadWindiUIConfig } from '@windi-ui/tailwind/config';

const { config, sources } = loadWindiUIConfig();
```

```ts
function loadWindiUIConfig(options?: {
	/** Where the search starts, and what `config` is relative to. Default: `process.cwd()` */
	cwd?: string;
	/** Load this file instead of searching */
	config?: string;
}): {
	config: Config;
	/** The files the config came from; empty when none was found */
	sources: string[];
};
```

It is synchronous. The result is cached and only read again when the modification time of one of `sources`
changes, because Tailwind v4 runs a plugin on every build. Two changes are only picked up after a restart:

- a config file added later, nearer to the working directory than the one in use;
- a change in a module the config file imports. `sources` holds the config file alone, so save the config
  file as well, or restart.
