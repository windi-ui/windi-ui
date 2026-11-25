# Config file and plugin module

Options that an `@plugin` block cannot hold, such as [`build`](/reference/options#build), go in a file of
their own. There are two kinds, and they have different names:

| | Config file | Plugin module |
| --- | --- | --- |
| Name | `windiui.config.ts`, or `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`, `.json`, or `package.json#windiui` | `windiui.plugin.ts`, or any name except `windiui.config.*` |
| Exports | The options: `export default defineConfig({ ... })` | The plugin: `export default windiui({ ... })` |
| Loaded by | WindiUI: the [search](#search), or the [`config`](/reference/options#config) option | Tailwind: `@plugin "./windiui.plugin.ts"` on v4, the `plugins` of `tailwind.config.*` on v3 |
| Path relative to | The working directory | The stylesheet, or the file that imports it |
| Rebuilds on change (Tailwind v4 dev) | No, see [Rebuilds](#rebuilds) | Yes |
| Read by [`loadWindiUIConfig`](#loadwindiuiconfig) | Yes | Only when its `config` option names it |

Keep the two names apart: `windiui.config.*` is the name the search looks for, and a file of that name
exports options.

## Which one to use

- **A config file** for plain options and zero config: `@plugin "@windi-ui/tailwind";` finds it with nothing
  to point at. Tools that need the same options as the plugin, such as a script or a test that calls
  [`safelistSource()`](/reference/options#tailwind-v4) or [`loadWindiUIConfig()`](#loadwindiuiconfig), read
  it too.
- **A plugin module** when the stylesheet should say which file is meant: in a monorepo or a layered app, where
  the working directory can be the wrong one, see [The working directory](#the-working-directory). Also for a
  `build` you edit while the dev server runs, since Tailwind v4 rebuilds when the module changes.

## Config file

The file exports the options. `defineConfig` only adds types:

```ts [windiui.config.ts]
import { defineConfig } from '@windi-ui/tailwind';

export default defineConfig({
	prefix: 'app',
	build(builder) {
		// ...
	}
});
```

`defineConfig` is also exported from `@windi-ui/core`. Plain options can be JSON, in `windiui.config.json`
or under the `windiui` key of `package.json`:

```json [package.json]
{
	"windiui": { "prefix": "app", "variantScope": "inherit" }
}
```

### Search

`@plugin "@windi-ui/tailwind";` and `windiui()` look for the nearest of these, from the working directory up to
the workspace root:

- `windiui.config.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` or `.json`
- the `windiui` key of the nearest `package.json`

The workspace root is the nearest directory with a `pnpm-workspace.yaml`, a `.git` or a lockfile. A
`windiui.config.*` file anywhere on the way wins over `package.json`.

The search is skipped when the call passes [`build`](/reference/options#build), because that call is already
a complete config, and when it passes `config: false`.

### Named file

The [`config`](/reference/options#config) option loads that file instead of searching:

::: code-group

```css [main.css (Tailwind v4)]
@plugin "@windi-ui/tailwind" {
	config: "./config/windiui.config.ts";
}
```

```ts [tailwind.config.ts]
windiui({ config: './config/windiui.config.ts' })
```

:::

The path is relative to the working directory of the build, not to the stylesheet. A file that does not exist
is an error.

## Plugin module

The module exports the configured plugin, and Tailwind loads it like any other plugin:

::: code-group

```ts [windiui.plugin.ts]
import windiui from '@windi-ui/tailwind';

export default windiui({
	prefix: 'app',
	build(builder) {
		// ...
	}
});
```

```css [main.css (Tailwind v4)]
@import "tailwindcss";
@plugin "./windiui.plugin.ts";
```

```ts [tailwind.config.ts (Tailwind v3)]
import type { Config } from 'tailwindcss';
import windiuiPlugin from './windiui.plugin';

export default {
	plugins: [windiuiPlugin],
} satisfies Config;
```

:::

On Tailwind v3 the call can also stay in `tailwind.config.*` itself.

A call that passes [`build`](/reference/options#build) is a complete config, and WindiUI looks for no config
file. A call without `build` still [searches](#search) from the working directory and takes the options it does
not set itself from the file it finds. Pass `config: false` to stop that, which is what you want in a monorepo:

```ts [windiui.plugin.ts]
export default windiui({ prefix: 'app', config: false });
```

## How the options are resolved

1. The options of the call, or of the `@plugin` block, are taken first.
2. With `config: false`, nothing else is read.
3. With `config: './path'`, that file is loaded.
4. Without `config`, a call that passes `build` reads nothing else, and any other call [searches](#search).

Options of the call or the block override those of the file, one by one:

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
directory and the wrong file. Use a [plugin module](#plugin-module) there.

### Rebuilds

Checked with `@tailwindcss/vite` 4.3.5 on Vite 8: Tailwind only rebuilds for the modules it loaded itself.

- A **plugin module** is one of them. Saving it rebuilds the CSS.
- A **config file**, named or searched, is not. Saving it does not change the CSS of a running dev server. The
  new config is read by the next full rebuild: save the stylesheet, or restart the dev server.
- A **module that a config file imports** is not watched by WindiUI either. After changing it, save the config
  file too and then the stylesheet, or restart the dev server.

A build-tool plugin that watches the config file is planned in
[#61](https://github.com/windi-ui/windi-ui/issues/61).

### Node.js

Config files are loaded with [unconfig](https://github.com/antfu-collective/unconfig), which needs a Node.js
that can `require()` an ES module: 22.12 or higher, or 20.19 or higher. On an older one a named file is an
error and the search is skipped. A plugin module has no such requirement.

## `loadWindiUIConfig`

The loader behind the named file and the search, for tools that need the same config as the plugin. Node.js
only.

```ts
import { loadWindiUIConfig } from '@windi-ui/tailwind';

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
