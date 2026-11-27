# Contrast audit

Which variant and color pairs of your config fail 4.5:1? With your own palettes, variants or a preset, nobody can
answer that by reading the config, and a test matrix written by hand drifts. `windiui audit` computes the whole
matrix from the config the plugin loads, and exits with 1 when a pair fails, so it can gate CI.

::: info New in 0.9
The `windiui` command comes with `@windi-ui/core`. `npx @windi-ui/core audit` runs it; a bare `npx windiui` may run
an unrelated npm package of that name. With `@windi-ui/core` in your dependencies beside `@windi-ui/tailwind`,
`windiui audit` also runs in a package.json script. It runs on the [theme engine](/guide/theme-engine) and its
[calibration](/guide/theme-engine#calibrate-contrast).
:::

## Run it

```sh
npx @windi-ui/core audit
npx @windi-ui/core audit --config ./windiui.config.ts --text 4.5 --border 3
npx @windi-ui/core audit --palettes ./palettes.json --format json
npx @windi-ui/core audit --fix
```

It loads the [config file](/reference/config-file#config-file) the plugin finds from the working directory, or the
one `--config` names: `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`, `.json` or `package.json#windiui`. A plugin
module that exports `windiui({ ... })` works too. Its presets, `build`, `overrides` and `calibrate` calls run as in
the build, so the matrix is what the CSS paints.

The config is loaded, and Tailwind's palettes are given, by the `@windi-ui/tailwind` of the project: the one the
config file's directory resolves, or else the working directory's, so that the audit of an app in a monorepo uses
that app's packages. Without it, `--palettes` gives the palettes and the default config is audited.

```text
variant  color    mode   state  pair    ratio  result
solid    yellow   light  rest   fg/bg   2.93   FAIL (needs bg 700)
solid    blue     light  rest   fg/bg   5.25   ok
outline  yellow   light  rest   fg/bg   2.93   FAIL (needs fg 700, border 700)
outline  yellow   light  rest   border  2.93   FAIL (needs fg 700, border 700)
```

There is a row for every variant on every color, light and dark, at rest and in every state the variant declares,
and for each check of the policy. The `state` column is `rest`, `hover`, or the name of another state of the
variant's `pseudos`, such as `active` for `:active` or `open` for `[data-state=open]` named by
[`states`](/reference/options#states); `--fix` sets a fix in a state under its selector. A disabled state, such
as `:disabled` or `[data-disabled]`, has no row: WCAG exempts inactive components. The checks:

- `fg/bg`: `fg` on `bg`. A translucent background, such as the one of `v-light` in dark mode, is painted over each
  backdrop first, and the ratio is the lowest over them.
- `border`: a visible `border` against the backdrop. A border with opacity 0, such as the one of `v-solid`, has no
  row.

A failing row says which shades [calibration](/guide/theme-engine#calibrate-contrast) would give the cell, or `no
fix` when it finds none. A color whose shades are not literal, such as one given by CSS variables, is not checked:
the summary on stderr lists it.

## Options

| Option | Description |
| --- | --- |
| `--config <file>` | The config file, relative to the working directory. Left out, the one the plugin finds. |
| `--palettes <file>` | A JSON file of palettes by name, each its 11 shades as literal colors, over Tailwind's. Tailwind's are those of the Tailwind the project installs: 3's hex values, or else 4's `oklch()` ones. |
| `--text <ratio>` | The lowest contrast of `fg` on `bg`. 4.5 unless only `--border` is given. |
| `--border <ratio>` | The lowest contrast of a visible border against the backdrop. Left out, borders are not checked. |
| `--backdrop-light <color>` | A backdrop in light mode: a literal color or a shade of the root variables, such as `default-50`. Repeat it to check over each. Left out, `white`. |
| `--backdrop-dark <color>` | The same in dark mode. Left out, `default-950`; give one when `default` is given by CSS variables, as its shades are then not literal. |
| `--format <format>` | `table` (default), `markdown` or `json`. |
| `--fix` | Prints the `overrideVariant` calls calibration would add, in place of the matrix. |
| `-h`, `--help` | Prints the options. |

The ratios are WCAG 2 contrast ratios, cut to two decimals in a table, so that 4.496 shows as 4.49 and not as 4.50;
JSON keeps them whole. Whatever the format, stdout holds only the output, and the summary, such as
`129 of 448 cells fail.`, goes to stderr.

| Exit code | When |
| --- | --- |
| 0 | Every cell passes. |
| 1 | A cell fails. |
| 2 | An unknown option or command, a config or palettes file that cannot be read, or a backdrop that is not a literal color. |

`--format json` prints what [`engine.audit`](/reference/theme-engine#audit) returns: every cell with its contrast,
its failing checks and its fix, the colors it skipped, and the `overrides` calibration would add, in the shape of
the [`overrides`](/reference/options#overrides) option.

## Fix what fails

`--fix` prints the calls for the body of [`build`](/reference/options#build), one per variant and override, with
the colors that share it:

```ts
b.overrideVariant('solid', ['orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky'], { bg: '700', pseudos: { ':hover': { bg: '800' } } });
b.overrideVariant('outline', ['orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky'], { fg: '700' });
// solid brand dark hover: calibration finds no shade that passes
```

Paste them into your config, and the audit passes:

```ts [windiui.config.ts]
import { defineConfig } from '@windi-ui/core';

export default defineConfig({
	build(b) {
		b.overrideVariant('solid', ['orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky'], { bg: '700', pseudos: { ':hover': { bg: '800' } } });
	},
});
```

A comment marks each cell calibration cannot repair with the default strategy. Calling
[`b.calibrate(policy)`](/guide/theme-engine#in-the-build-1) in your config does the same at build time, with a
strategy of your choice; the audit then checks the calibrated result.

## In CI

The non-zero exit fails the job when a change to a palette, a variant or a preset breaks contrast:

```yaml
- name: Contrast audit
  run: npx @windi-ui/core audit --text 4.5 --border 3
```

`--format markdown >> "$GITHUB_STEP_SUMMARY"` puts the matrix in the summary of a GitHub Actions job. WindiUI's own
CI does that for the default config and the `nuxt-ui` preset. Neither is calibrated by default, as the shades a
color needs are your project's choice, so both report failures there; `--fix` gives the overrides that make them
pass.
